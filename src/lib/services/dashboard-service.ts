import { prisma } from '@/lib/prisma'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'
import { cached } from '@/lib/cache'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

type RoleStrategy = (session: ApiSession, db: DbClient) => Promise<Resultado<Record<string, unknown>>>

function inicioMesActual(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function finMesActual(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
}

async function header(session: ApiSession, db: DbClient) {
  const [userInfo, tenantRecord, tenantConfig] = await Promise.all([
    db.usuario.findUnique({
      where: { id: session.userId },
      select: { nombre: true, apellido: true },
    }),
    session.tenantId
      ? db.tenant.findUnique({ where: { id: session.tenantId }, select: { nombre: true } })
      : null,
    session.tenantId
      ? db.configuracionTenant.findUnique({ where: { tenantId: session.tenantId }, select: { logoUrl: true } })
      : null,
  ])
  return { user: userInfo, tenantName: tenantRecord?.nombre ?? null, tenantLogo: tenantConfig?.logoUrl ?? null }
}

async function portfolioDashboard(
  db: DbClient,
  tenantId: number | undefined
): Promise<Record<string, unknown>> {
  const inicioMes = inicioMesActual()
  const finMes = finMesActual()

  const [vendedores, rawClientes, tenantConfig] = await Promise.all([
    db.usuario.findMany({
      where: { ...(tenantId ? { tenantId } : {}), rol: 'vendedor', activo: 1 },
      select: {
        id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true,
        _count: { select: { clientes: true } },
        prestamosCreados: { select: { montoSolicitado: true, estado: true } },
      },
    }),
    db.prestamo.findMany({
      where: { ...(tenantId ? { tenantId } : {}), estado: 'activo' },
      select: {
        cliente: { select: { nombre: true, apellido: true } },
        cuotaDiaria: true,
        saldoPendiente: true,
        diasAtrasados: true,
        fechaInicio: true,
        fechaUltimoPago: true,
        estado: true,
        vendedor: { select: { nombre: true, apellido: true } },
        pagos: { select: { fechaPago: true, diasCubiertos: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    tenantId
      ? db.configuracionTenant.findUnique({ where: { tenantId }, select: { porcentajeComisionVendedor: true } })
      : null,
  ])

  const porcentajeComision = Number(tenantConfig?.porcentajeComisionVendedor ?? 0)

  const clientes = rawClientes.map((c) => ({ ...c, diasAtrasados: calcularDiasAtrasados(c) }))
  const totalPorVendedor = (v: (typeof vendedores)[number]) =>
    v.prestamosCreados.reduce((s, p) => s + Number(p.montoSolicitado), 0)

  const vendedorIds = vendedores.map(v => v.id)
  const pagosMes = vendedorIds.length > 0 ? await db.pago.groupBy({
    by: ['vendedorId'],
    where: {
      ...(tenantId ? { tenantId } : {}),
      vendedorId: { in: vendedorIds },
      fechaPago: { gte: inicioMes, lte: finMes },
    },
    _sum: { monto: true },
  }) : []

  const recaudadoPorVendedor = new Map<number, number>()
  for (const pg of pagosMes) {
    recaudadoPorVendedor.set(pg.vendedorId, Number(pg._sum.monto ?? 0))
  }

  return {
    vendedores: vendedores.map((v) => {
      const recaudadoMes = recaudadoPorVendedor.get(v.id) ?? 0
      const comisionMes = recaudadoMes * porcentajeComision / 100
      return {
        id: v.id,
        cedula: v.cedula,
        nombre: v.nombre,
        apellido: v.apellido,
        telefono: v.telefono,
        email: v.email,
        total_clientes: v._count.clientes,
        total_prestado: totalPorVendedor(v),
        recaudado_mes: recaudadoMes,
        comision_mes: comisionMes,
      }
    }),
    clientes,
    comisionPorcentaje: porcentajeComision,
    stats: {
      total_vendedores: vendedores.length,
      colocacion_total: vendedores.reduce((sum, v) => sum + totalPorVendedor(v), 0),
      atrasados: clientes.filter((c) => c.diasAtrasados > 0).length,
    },
  }
}

async function vendedorDashboard(session: ApiSession, db: DbClient): Promise<Record<string, unknown>> {
  const inicioMes = inicioMesActual()
  const finMes = finMesActual()

  const [rawPrestamos, totalClientes, tenantConfig, pagoMes] = await Promise.all([
    db.prestamo.findMany({
      where: { vendedorId: session.userId, ...(session.tenantId ? { tenantId: session.tenantId } : {}) },
      take: 50,
      include: {
        cliente: { select: { nombre: true, apellido: true, cedula: true } },
        pagos: { select: { id: true, monto: true, fechaPago: true, diasCubiertos: true, esPagoAtrasado: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    db.usuario.count({ where: { rol: 'cliente', vendedorId: session.userId } }),
    session.tenantId
      ? db.configuracionTenant.findUnique({ where: { tenantId: session.tenantId }, select: { porcentajeComisionVendedor: true } })
      : null,
    db.pago.aggregate({
      where: {
        vendedorId: session.userId,
        ...(session.tenantId ? { tenantId: session.tenantId } : {}),
        fechaPago: { gte: inicioMes, lte: finMes },
      },
      _sum: { monto: true },
    }),
  ])

  const prestamos = rawPrestamos.map((p) => ({
    ...p,
    diasAtrasados: calcularDiasAtrasados(p),
  }))

  const porcentajeComision = Number(tenantConfig?.porcentajeComisionVendedor ?? 0)
  const recaudadoMes = Number(pagoMes._sum.monto ?? 0)
  const comisionMes = recaudadoMes * porcentajeComision / 100

  return {
    prestamos,
    stats: {
      total_prestamos: prestamos.length,
      activos: prestamos.filter((p) => p.estado === 'activo').length,
      pagados: prestamos.filter((p) => p.estado === 'pagado').length,
      monto_prestado: prestamos.reduce((s, p) => s + Number(p.montoSolicitado), 0),
      monto_recuperado: prestamos.reduce((s, p) => s + Number(p.montoPagado), 0),
      saldo_pendiente: prestamos.reduce((s, p) => s + Number(p.saldoPendiente), 0),
      total_clientes: totalClientes,
      recaudado_mes: recaudadoMes,
      comision_porcentaje: porcentajeComision,
      comision_mes: comisionMes,
    },
  }
}

async function clienteDashboard(session: ApiSession, db: DbClient): Promise<Record<string, unknown>> {
  const [usuario, rawPrestamos] = await Promise.all([
    db.usuario.findUnique({
      where: { id: session.userId },
      select: { cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true },
    }),
    db.prestamo.findMany({
      where: { clienteId: session.userId },
      orderBy: { createdAt: 'desc' },
      include: { pagos: { select: { id: true, monto: true, fechaPago: true, diasCubiertos: true, esPagoAtrasado: true, createdAt: true } } },
    }),
  ])
  const prestamos = rawPrestamos.map((p) => ({ ...p, diasAtrasados: calcularDiasAtrasados(p) }))
  return { cliente: usuario, prestamos }
}

const strategies: Record<string, RoleStrategy> = {
  superadmin: async (_session, db) => {
    const [head, data] = await Promise.all([header(_session, db), portfolioDashboard(db, undefined)])
    return { ok: true, data: { ...data, ...head } }
  },
  empresario: async (session, db) => {
    if (!session.tenantId) {
      return { ok: false, status: 400, message: 'Tenant no asignado' }
    }
    const [head, data] = await Promise.all([header(session, db), portfolioDashboard(db, session.tenantId)])
    return { ok: true, data: { ...data, ...head } }
  },
  vendedor: async (session, db) => {
    const [head, data] = await Promise.all([header(session, db), vendedorDashboard(session, db)])
    return { ok: true, data: { ...data, ...head } }
  },
  cliente: async (session, db) => {
    const [head, data] = await Promise.all([header(session, db), clienteDashboard(session, db)])
    return { ok: true, data: { ...data, ...head } }
  },
}

export async function getDashboard(
  session: ApiSession,
  db: DbClient = prisma
): Promise<Resultado<Record<string, unknown>>> {
  const strategy = strategies[session.rol]
  if (!strategy) {
    return { ok: false, status: 400, message: 'Rol no válido' }
  }
  // cache 30s por rol+tenant+usuario para evitar N queries paralelas en dashboard
  const cacheKey = `dash:${session.rol}:${session.tenantId ?? 'global'}:${session.userId}`
  const ttl = session.rol === 'vendedor' ? 30_000 : 30_000
  try {
    const result = await cached(cacheKey, ttl, () => strategy(session, db))
    return result
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error)
    return { ok: false, status: 500, message: 'Error del servidor' }
  }
}
