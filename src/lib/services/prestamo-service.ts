import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generarPasswordAleatoria } from '@/lib/password'
import { sendCredenciales } from '@/lib/mail'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'
import { sendWhatsAppText, formatNuevoPrestamo } from '@/lib/evolution-api'
import { roundMoney, esMontoValido } from '@/lib/money'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

export const TASA_DEFAULT = 20.0
export const CUOTA_DEFAULT = 5000

export async function getTenantConfig(tenantId: number, db: DbClient = prisma) {
  const config = await db.configuracionTenant.findUnique({ where: { tenantId } })
  const tasa = config ? Number(config.tasaInteres) : TASA_DEFAULT
  const cuota = config && Number(config.cuotaDiariaMin) > 0 ? Number(config.cuotaDiariaMin) : CUOTA_DEFAULT
  return { tasa, cuota }
}

type ClienteResuelto = { clienteId: number; telefono: string | null; nombreCliente: string }

async function resolverCliente(
  session: ApiSession,
  clienteId: number | null,
  data: Record<string, unknown>,
  db: DbClient
): Promise<Resultado<ClienteResuelto>> {
  if (clienteId) {
    const cliente = await db.usuario.findFirst({
      where: {
        id: clienteId,
        rol: 'cliente',
        ...(session.tenantId ? { tenantId: session.tenantId } : {}),
      },
      select: { nombre: true, apellido: true, telefono: true, vendedorId: true },
    })
    if (!cliente) {
      return { ok: false, status: 404, message: 'Cliente no encontrado' }
    }
    if (session.rol === 'vendedor' && cliente.vendedorId !== session.userId) {
      return { ok: false, status: 403, message: 'No autorizado para este cliente' }
    }
    return {
      ok: true,
      data: { clienteId, telefono: cliente.telefono, nombreCliente: `${cliente.nombre} ${cliente.apellido}`.trim() },
    }
  }

  const nombre = typeof data.nombre === 'string' ? data.nombre.trim() : ''
  const cedula = typeof data.cedula === 'string' ? data.cedula.trim() : ''
  if (!nombre || !cedula) {
    return { ok: false, status: 400, message: 'Nombre y cédula requeridos para crear el cliente' }
  }

  const existing = await db.usuario.findUnique({ where: { cedula } })
  if (existing) {
    return { ok: false, status: 400, message: 'La cédula ya existe' }
  }

  const apellido = typeof data.apellido === 'string' ? data.apellido : ''
  const telefono = typeof data.telefono === 'string' ? data.telefono.replace(/[^0-9]/g, '') || null : null
  const email = typeof data.email === 'string' ? data.email : null
  const password = generarPasswordAleatoria()
  const passHash = await hashPassword(password)
  const nuevo = await db.usuario.create({
    data: {
      cedula,
      nombre,
      apellido,
      telefono,
      email,
      rol: 'cliente',
      password: passHash,
      vendedorId: session.userId,
      tenantId: session.tenantId!,
    },
  })
  if (email) {
    await sendCredenciales({
      to: email,
      nombre: `${nombre} ${apellido}`.trim(),
      correo: email,
      password,
      rol: 'Cliente',
    })
  }
  return { ok: true, data: { clienteId: nuevo.id, telefono, nombreCliente: `${nombre} ${apellido}`.trim() } }
}

export async function crearPrestamo(
  session: ApiSession,
  data: Record<string, unknown>,
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  if (!session.tenantId) {
    return { ok: false, status: 400, message: 'Tenant no asignado' }
  }

  const { checkTenantActive, checkTenantLimit } = await import('@/lib/tenant')
  const active = await checkTenantActive(session.tenantId)
  if (!active.ok) {
    return { ok: false, status: 403, message: active.message ?? 'Tenant inactivo' }
  }
  const limitCheck = await checkTenantLimit(session.tenantId, 'MAX_PRESTAMOS')
  if (!limitCheck.ok) {
    return { ok: false, status: 403, message: limitCheck.message ?? 'Límite alcanzado' }
  }

  const clienteId = data.cliente_id ? parseInt(String(data.cliente_id)) : null
  const montoSolicitado = Number(data.monto)
  if (!esMontoValido(montoSolicitado)) {
    return { ok: false, status: 400, message: 'Monto inválido' }
  }

  const resuelto = await resolverCliente(session, clienteId, data, db)
  if (!resuelto.ok) return resuelto
  const { clienteId: idCliente, telefono, nombreCliente } = resuelto.data!

  const { tasa, cuota } = await getTenantConfig(session.tenantId, db)
  const monto = roundMoney(montoSolicitado)
  const interesNuevo = roundMoney(monto * (tasa / 100))
  const montoNuevoConInteres = roundMoney(monto + interesNuevo)

  const prestamoActivo = await db.prestamo.findFirst({
    where: { clienteId: idCliente, estado: 'activo', tenantId: session.tenantId },
    orderBy: { createdAt: 'desc' },
  })

  if (prestamoActivo) {
    const saldoExistente = Number(prestamoActivo.saldoPendiente)
    const nuevoMontoTotal = roundMoney(Number(prestamoActivo.montoTotal) + montoNuevoConInteres)
    const nuevoSaldo = roundMoney(saldoExistente + montoNuevoConInteres)
    const nuevoInteresTotal = roundMoney(Number(prestamoActivo.interesTotal) + interesNuevo)
    const nuevasDias = Math.ceil(nuevoMontoTotal / cuota)
    const nuevaFechaFin = new Date(prestamoActivo.fechaInicio)
    nuevaFechaFin.setDate(nuevaFechaFin.getDate() + nuevasDias)

    const prestamo = await db.prestamo.update({
      where: { id: prestamoActivo.id },
      data: {
        montoSolicitado: roundMoney(Number(prestamoActivo.montoSolicitado) + monto),
        interesTotal: nuevoInteresTotal,
        montoTotal: nuevoMontoTotal,
        saldoPendiente: nuevoSaldo,
        diasPlazo: nuevasDias,
        fechaFinEsperada: nuevaFechaFin,
      },
    })

    if (telefono) {
      const msg = formatNuevoPrestamo({
        cliente: nombreCliente,
        montoSolicitado: monto,
        tasaInteres: tasa,
        interesTotal: interesNuevo,
        montoTotal: montoNuevoConInteres,
        cuotaDiaria: cuota,
        diasPlazo: nuevasDias,
        esConsolidacion: true,
        deudaPrevia: saldoExistente,
      })
      sendWhatsAppText(telefono, msg).catch(() => {})
    }

    return { ok: true, message: 'Préstamo anexado al saldo existente', data: prestamo }
  }

  const diasPlazo = Math.ceil(montoNuevoConInteres / cuota)
  const fechaInicio = new Date()
  const fechaFin = new Date(fechaInicio)
  fechaFin.setDate(fechaFin.getDate() + diasPlazo)

  const prestamo = await db.prestamo.create({
    data: {
      clienteId: idCliente,
      vendedorId: session.userId,
      tenantId: session.tenantId,
      montoSolicitado: monto,
      tasaInteres: tasa,
      interesTotal: interesNuevo,
      montoTotal: montoNuevoConInteres,
      cuotaDiaria: cuota,
      diasPlazo,
      saldoPendiente: montoNuevoConInteres,
      estado: 'activo',
      fechaInicio,
      fechaFinEsperada: fechaFin,
    },
  })

  if (telefono) {
    const msg = formatNuevoPrestamo({
      cliente: nombreCliente,
      montoSolicitado: monto,
      tasaInteres: tasa,
      interesTotal: interesNuevo,
      montoTotal: montoNuevoConInteres,
      cuotaDiaria: cuota,
      diasPlazo,
    })
    sendWhatsAppText(telefono, msg).catch(() => {})
  }

  return { ok: true, message: 'Préstamo registrado con éxito', data: prestamo }
}

type PrestamoWhere = Record<string, unknown>

const queryStrategies: Record<
  string,
  (session: ApiSession) => { where: PrestamoWhere; include: 'portfolio' | 'none' }
> = {
  superadmin: () => ({ where: {}, include: 'portfolio' as const }),
  empresario: (s) => ({ where: { tenantId: s.tenantId }, include: 'portfolio' }),
  vendedor: (s) => ({ where: { vendedorId: s.userId, tenantId: s.tenantId ?? undefined }, include: 'portfolio' }),
  cliente: (s) => ({ where: { clienteId: s.userId }, include: 'none' }),
}

export async function listarPrestamos(
  session: ApiSession,
  options: { clienteId?: number; limit?: number; offset?: number } = {},
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const { clienteId } = options
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)

  if (clienteId !== undefined) {
    if (!clienteId) {
      return { ok: false, status: 400, message: 'cliente_id inválido' }
    }
    if (session.rol === 'cliente' && clienteId !== session.userId) {
      return { ok: false, status: 403, message: 'No autorizado' }
    }
    if (session.rol !== 'superadmin') {
      const cliente = await db.usuario.findFirst({
        where: {
          id: clienteId,
          rol: 'cliente',
          ...(session.tenantId ? { tenantId: session.tenantId } : {}),
        },
        select: { vendedorId: true },
      })
      if (!cliente) {
        return { ok: false, status: 403, message: 'Cliente no encontrado' }
      }
      if (session.rol === 'vendedor' && cliente.vendedorId !== session.userId) {
        return { ok: false, status: 403, message: 'No autorizado' }
      }
    }

    const [total, raw] = await Promise.all([
      db.prestamo.count({ where: { clienteId } }),
      db.prestamo.findMany({
        where: { clienteId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: { pagos: { select: { fechaPago: true, diasCubiertos: true } } },
      }),
    ])
    return { ok: true, data: raw.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) })), total }
  }

  const strategy = queryStrategies[session.rol]
  if (!strategy) {
    return { ok: false, status: 403, message: 'Rol no autorizado' }
  }

  const { where, include } = strategy(session)
  const [total, raw] = await Promise.all([
    db.prestamo.count({ where }),
    db.prestamo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include:
        include === 'portfolio'
          ? {
              cliente: { select: { nombre: true, apellido: true, cedula: true } },
              vendedor: { select: { nombre: true, apellido: true } },
              pagos: { select: { fechaPago: true, diasCubiertos: true } },
            }
          : undefined,
    }),
  ])
  return { ok: true, data: raw.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) })), total, limit, offset }
}
