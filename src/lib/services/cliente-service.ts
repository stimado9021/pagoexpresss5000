import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generarPasswordAleatoria } from '@/lib/password'
import { sendCredenciales } from '@/lib/mail'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

function tenantFilter(session: ApiSession): { tenantId?: number } {
  return session.rol === 'superadmin' ? {} : { tenantId: session.tenantId ?? undefined }
}

function withAtrasos(clientes: { prestamosCliente: { estado: string; fechaInicio: string | Date; fechaUltimoPago: string | Date | null; diasAtrasados?: number }[] }[]) {
  return clientes.map((c) => ({
    ...c,
    prestamosCliente: c.prestamosCliente.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) })),
  }))
}

export async function crearCliente(
  session: ApiSession,
  datos: Record<string, unknown>,
  db: DbClient = prisma
): Promise<Resultado<{ id: number }>> {
  if (session.rol !== 'superadmin' && session.tenantId) {
    const { checkTenantLimit, checkTenantActive } = await import('@/lib/tenant')
    const active = await checkTenantActive(session.tenantId)
    if (!active.ok) {
      return { ok: false, status: 403, message: active.message ?? 'Tenant inactivo' }
    }
    const limitCheck = await checkTenantLimit(session.tenantId, 'MAX_CLIENTES')
    if (!limitCheck.ok) {
      return { ok: false, status: 403, message: limitCheck.message ?? 'Límite alcanzado' }
    }
  }

  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : ''
  const cedula = typeof datos.cedula === 'string' ? datos.cedula.trim() : ''
  if (!nombre || !cedula) {
    return { ok: false, status: 400, message: 'Datos incompletos' }
  }

  const existing = await db.usuario.findUnique({ where: { cedula } })
  if (existing) {
    return { ok: false, status: 400, message: 'La cédula ya existe' }
  }

  let vendedorId = session.userId
  if (datos.vendedor_id) {
    vendedorId = parseInt(String(datos.vendedor_id))
    if (session.rol === 'vendedor') {
      return { ok: false, status: 403, message: 'No autorizado' }
    }
    const vendedor = await db.usuario.findFirst({
      where: { id: vendedorId, rol: 'vendedor', ...tenantFilter(session) },
    })
    if (!vendedor) {
      return { ok: false, status: 400, message: 'Vendedor no válido' }
    }
  }

  const password = generarPasswordAleatoria()
  const passHash = await hashPassword(password)
  const usuario = await db.usuario.create({
    data: {
      cedula,
      nombre,
      apellido: typeof datos.apellido === 'string' ? datos.apellido : '',
      telefono: typeof datos.telefono === 'string' ? datos.telefono : null,
      email: typeof datos.email === 'string' ? datos.email : null,
      direccion: typeof datos.direccion === 'string' ? datos.direccion : null,
      rol: 'cliente',
      password: passHash,
      activo: 1,
      vendedorId,
      tenantId: session.tenantId!,
    },
  })

  if (usuario.email) {
    await sendCredenciales({
      to: usuario.email,
      nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
      correo: usuario.email,
      password,
      rol: 'Cliente',
    })
  }

  return { ok: true, message: 'Cliente creado correctamente', data: { id: usuario.id }, status: 201 }
}

export async function actualizarCliente(
  session: ApiSession,
  datos: Record<string, unknown>,
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const id = datos.id ? parseInt(String(datos.id)) : null
  if (!id) {
    return { ok: false, status: 400, message: 'ID del cliente requerido' }
  }

  const cliente = await db.usuario.findFirst({
    where: { id, ...tenantFilter(session) },
  })
  if (!cliente) {
    return { ok: false, status: 404, message: 'Cliente no encontrado' }
  }

  if (session.rol === 'vendedor' && cliente.vendedorId !== session.userId) {
    return { ok: false, status: 403, message: 'No autorizado para editar este cliente' }
  }

  const updated = await db.usuario.update({
    where: { id },
    data: {
      nombre: typeof datos.nombre === 'string' ? datos.nombre : cliente.nombre,
      apellido: typeof datos.apellido === 'string' ? datos.apellido : cliente.apellido,
      telefono: datos.telefono !== undefined ? datos.telefono || null : cliente.telefono,
      email: datos.email !== undefined ? datos.email || null : cliente.email,
      direccion: datos.direccion !== undefined ? datos.direccion || null : cliente.direccion,
    },
    select: { id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true },
  })

  return { ok: true, message: 'Cliente actualizado correctamente', data: updated }
}

export type ClienteQuery = {
  rol?: string
  buscar?: string
  id?: string
  resumen?: string
  cliente_id?: string
  vendedor_id?: string
}

type HandlerCtx = { session: ApiSession; query: ClienteQuery; db: DbClient }
type ClienteQueryHandler = (ctx: HandlerCtx) => Promise<Resultado<unknown>>

function clave(session: ApiSession, q: ClienteQuery): string {
  if (q.resumen && session.rol === 'vendedor') return 'resumen_vendedor'
  if (q.vendedor_id && (session.rol === 'superadmin' || session.rol === 'empresario')) return 'por_vendedor'
  if (q.rol && session.rol === 'superadmin') return 'por_rol'
  if (q.buscar) return 'buscar'
  if (q.id) return 'detalle'
  if (q.resumen && q.cliente_id) return 'resumen_cliente'
  return 'invalido'
}

const handlers: Record<string, ClienteQueryHandler> = {
  resumen_vendedor: async ({ session, db }) => {
    const clientes = await db.usuario.findMany({
      where: { rol: 'cliente', vendedorId: session.userId },
      select: {
        id: true, cedula: true, nombre: true, apellido: true,
        telefono: true, email: true, direccion: true, activo: true, createdAt: true,
        prestamosCliente: {
          select: {
            id: true, estado: true, montoSolicitado: true, montoPagado: true,
            saldoPendiente: true, cuotaDiaria: true, diasAtrasados: true,
            diasPlazo: true, diasPagados: true, fechaInicio: true, montoTotal: true,
            fechaUltimoPago: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    })
    return { ok: true, data: withAtrasos(clientes) }
  },

  por_vendedor: async ({ session, query, db }) => {
    const clientes = await db.usuario.findMany({
      where: { rol: 'cliente', vendedorId: parseInt(String(query.vendedor_id)), ...tenantFilter(session) },
      select: {
        id: true, cedula: true, nombre: true, apellido: true,
        telefono: true, email: true, direccion: true, activo: true, createdAt: true,
        prestamosCliente: {
          select: { estado: true, montoSolicitado: true, montoPagado: true, saldoPendiente: true, cuotaDiaria: true, diasAtrasados: true, fechaInicio: true, fechaUltimoPago: true, montoTotal: true },
        },
      },
      orderBy: { nombre: 'asc' },
    })
    return { ok: true, data: withAtrasos(clientes) }
  },

  por_rol: async ({ query, db }) => {
    const usuarios = await db.usuario.findMany({
      where: { rol: String(query.rol) },
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { prestamosCliente: true } } },
    })
    return {
      ok: true,
      data: usuarios.map((u) => ({
        id: u.id,
        cedula: u.cedula,
        nombre: u.nombre,
        apellido: u.apellido,
        telefono: u.telefono,
        email: u.email,
        direccion: u.direccion,
        activo: u.activo,
        created_at: u.createdAt,
        prestamos: u._count.prestamosCliente,
      })),
    }
  },

  buscar: async ({ session, query, db }) => {
    const term = String(query.buscar)
    const whereClause: {
      rol: string
      OR: { cedula?: { contains: string }; nombre?: { contains: string }; apellido?: { contains: string } }[]
      vendedorId?: number
      tenantId?: number
    } = {
      rol: 'cliente',
      OR: [
        { cedula: { contains: term } },
        { nombre: { contains: term } },
        { apellido: { contains: term } },
      ],
    }
    if (session.rol === 'vendedor') {
      whereClause.vendedorId = session.userId
    } else if (session.rol !== 'superadmin') {
      whereClause.tenantId = session.tenantId ?? undefined
    }
    const clientes = await db.usuario.findMany({
      where: whereClause,
      select: { id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true, activo: true, createdAt: true },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 50,
    })
    return { ok: true, data: clientes }
  },

  detalle: async ({ session, query, db }) => {
    const usuario = await db.usuario.findFirst({
      where: { id: parseInt(String(query.id)), ...tenantFilter(session) },
      select: {
        id: true, cedula: true, nombre: true, apellido: true, telefono: true,
        email: true, direccion: true, activo: true, vendedorId: true,
      },
    })
    if (!usuario) {
      return { ok: false, status: 404, message: 'Usuario no encontrado' }
    }
    const { vendedorId: owner, ...usuarioPublico } = usuario
    if (session.rol === 'vendedor' && owner !== session.userId) {
      return { ok: false, status: 403, message: 'No autorizado' }
    }
    const prestamosRaw = await db.prestamo.findMany({
      where: { clienteId: usuario.id },
      orderBy: { fechaInicio: 'desc' },
      include: { pagos: { orderBy: { fechaPago: 'desc' }, take: 5 } },
    })
    const prestamos = prestamosRaw.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) }))
    return { ok: true, data: { ...usuarioPublico, prestamos } }
  },

  resumen_cliente: async ({ session, query, db }) => {
    const idCliente = parseInt(String(query.cliente_id))
    const prestamoWhere: { clienteId: number; tenantId?: number } = { clienteId: idCliente }
    if (session.rol !== 'superadmin') prestamoWhere.tenantId = session.tenantId ?? undefined
    const rawPrestamos = await db.prestamo.findMany({
      where: prestamoWhere,
      orderBy: { createdAt: 'desc' },
    })
    const prestamos = rawPrestamos.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) }))
    const totales = prestamos.reduce(
      (acc, p) => ({
        total_prestamos: acc.total_prestamos + 1,
        prestamos_activos: acc.prestamos_activos + (p.estado === 'activo' ? 1 : 0),
        prestamos_pagados: acc.prestamos_pagados + (p.estado === 'pagado' ? 1 : 0),
        monto_total_prestado: acc.monto_total_prestado + Number(p.montoTotal),
        monto_total_pagado: acc.monto_total_pagado + Number(p.montoPagado),
        saldo_total_pendiente: acc.saldo_total_pendiente + Number(p.saldoPendiente),
      }),
      { total_prestamos: 0, prestamos_activos: 0, prestamos_pagados: 0, monto_total_prestado: 0, monto_total_pagado: 0, saldo_total_pendiente: 0 }
    )
    return { ok: true, data: { prestamos, totales } }
  },

  invalido: async () => ({ ok: false, status: 400, message: 'Parámetros inválidos' }),
}

export async function listarClientes(
  session: ApiSession,
  query: ClienteQuery = {},
  db: DbClient = prisma
): Promise<Resultado<unknown>> {
  const handler = handlers[clave(session, query)]
  try {
    return await handler({ session, query, db })
  } catch (error) {
    console.error('[CLIENTES GET ERROR]', error)
    return { ok: false, status: 500, message: 'Error del servidor' }
  }
}
