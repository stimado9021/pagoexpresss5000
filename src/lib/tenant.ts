import 'server-only'
import { prisma } from './prisma'
import { getSession } from './session'

export async function getCurrentTenant() {
  const session = await getSession()
  if (!session?.tenantId) return null
  return prisma.tenant.findUnique({
    where: { id: session.tenantId },
    include: { plan: { include: { limietes: true } } },
  })
}

export async function getTenantLimits(tenantId: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: { include: { limietes: true } } },
  })
  if (!tenant?.plan) return null

  const limits: Record<string, number> = {}
  for (const lim of tenant.plan.limietes) {
    limits[lim.recurso] = lim.valor
  }
  return { tenant, limits }
}

export async function checkTenantLimit(tenantId: number, recurso: string): Promise<{ ok: boolean; used: number; limit: number; message?: string }> {
  const { limits, tenant } = await getTenantLimits(tenantId) || { limits: {}, tenant: null }
  const safeLimits = (limits ?? {}) as Record<string, number>
  const limit = safeLimits[recurso] ?? -1

  if (limit === -1) return { ok: true, used: 0, limit: -1 }

  const tableMap: Record<string, string> = {
    MAX_VENDEDORES: 'usuarios',
    MAX_CLIENTES: 'usuarios',
    MAX_PRESTAMOS: 'prestamos',
  }

  const table = tableMap[recurso]
  if (!table) return { ok: true, used: 0, limit: -1 }

  const whereClause: { tenantId: number; rol?: string | { in: string[] } } = { tenantId }
  if (recurso === 'MAX_VENDEDORES') {
    whereClause.rol = { in: ['vendedor', 'empresario'] }
  } else if (recurso === 'MAX_CLIENTES') {
    whereClause.rol = 'cliente'
  }

  let used: number
  if (table === 'usuarios') {
    used = await prisma.usuario.count({ where: whereClause })
  } else {
    used = await prisma.prestamo.count({ where: { tenantId } })
  }

  if (used >= limit) {
    return {
      ok: false,
      used,
      limit,
      message: `L�mite alcanzado para ${recurso}.${limit > 0 ? ` Usa ${limit}/${used}.` : ''} Actualiza tu plan para m�s capacidad.`,
    }
  }

  return { ok: true, used, limit }
}

export async function getSubscription(tenantId: number) {
  return prisma.suscripcion.findUnique({
    where: { tenantId },
    include: { plan: true },
  })
}

export async function checkTenantActive(tenantId: number): Promise<{ ok: boolean; message?: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return { ok: false, message: 'Tenant no encontrado' }

  if (tenant.status === 'TRIAL') {
    if (tenant.trialEndsAt < new Date()) {
      return { ok: false, message: 'Tu periodo de prueba ha vencido. Activa un plan para continuar.' }
    }
    return { ok: true }
  }

  if (tenant.status === 'ACTIVE') return { ok: true }

  return { ok: false, message: 'Tu suscripción no está activa. Renueva tu plan para continuar.' }
}

export const TENANT_ROLES = {
  PLATFORM_ADMIN: 'superadmin',
  EMPRESARIO: 'empresario',
  VENDEDOR: 'vendedor',
  CLIENTE: 'cliente',
} as const