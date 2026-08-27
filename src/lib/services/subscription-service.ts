import { prisma } from '@/lib/prisma'
import type { ApiSession } from '@/lib/api-helpers'
import type { Resultado } from './types'

type DbClient = typeof prisma

function requireTenant(session: ApiSession): { tenantId: number } | Resultado<never> {
  if (!session.tenantId) {
    return { ok: false, status: 400, message: 'Tenant no asignado' }
  }
  return { tenantId: session.tenantId }
}

export async function getSuscripcion(
  session: ApiSession,
  db: DbClient = prisma
): Promise<Resultado<Record<string, unknown>>> {
  const tenant = requireTenant(session)
  if ('ok' in tenant) return tenant

  const subscription = await db.suscripcion.findUnique({
    where: { tenantId: tenant.tenantId },
    include: { plan: { include: { limietes: true } } },
  })

  if (!subscription) {
    return { ok: false, status: 404, message: 'Sin suscripción' }
  }

  return {
    ok: true,
    data: {
      id: subscription.id,
      planName: subscription.plan?.nombre,
      planId: subscription.planId,
      estado: subscription.estado,
      cicloActual: subscription.cicloActual,
      precioMensual: subscription.plan?.precioMensual,
      precioAnual: subscription.plan?.precioAnual,
      renovacionProxima: subscription.renovacionProxima,
      pagadoHasta: subscription.pagadoHasta,
      stripeCustomerId: subscription.stripeCustomerId,
    },
  }
}

export async function cambiarPlan(
  session: ApiSession,
  planId: unknown,
  db: DbClient = prisma
): Promise<Resultado<Record<string, unknown>>> {
  // Solo superadmin puede asignar plan sin pago (uso interno/admin)
  if (session.rol !== 'superadmin') {
    return { ok: false, status: 403, message: 'Solo el administrador puede asignar planes manualmente. Usa /api/subscriptions/checkout para pagar.' }
  }
  const tenant = requireTenant(session)
  if ('ok' in tenant) return tenant

  if (!planId) {
    return { ok: false, status: 400, message: 'planId requerido' }
  }

  const plan = await db.plan.findUnique({ where: { id: Number(planId) } })
  if (!plan || !plan.activo) {
    return { ok: false, status: 404, message: 'Plan no encontrado' }
  }

  const tenantRecord = await db.tenant.findUnique({
    where: { id: tenant.tenantId },
    include: { plan: true },
  })
  if (!tenantRecord) {
    return { ok: false, status: 404, message: 'Tenant no encontrado' }
  }

  const isUpgrade = plan.precioMensual > (tenantRecord.plan?.precioMensual ?? 0)
  const isDowngrade = plan.precioMensual < (tenantRecord.plan?.precioMensual ?? 0)

  const now = new Date()
  const billingCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const subscription = await db.suscripcion.upsert({
    where: { tenantId: tenant.tenantId },
    update: {
      planId: plan.id,
      estado: 'ACTIVE',
      cicloActual: 1,
      renovacionProxima: billingCycleEnd,
      pagadoHasta: billingCycleEnd,
    },
    create: {
      tenantId: tenant.tenantId,
      planId: plan.id,
      estado: 'ACTIVE',
      cicloActual: 1,
      renovacionProxima: billingCycleEnd,
      pagadoHasta: billingCycleEnd,
    },
    include: { plan: { include: { limietes: true } } },
  })

  await db.tenant.update({
    where: { id: tenant.tenantId },
    data: {
      planId: plan.id,
      status: 'ACTIVE',
      planStartsAt: now,
      planExpiresAt: billingCycleEnd,
    },
  })

  const oldPlanName = tenantRecord.plan?.nombre ?? 'NINGUNO'

  await db.historial.create({
    data: {
      usuarioId: session.userId,
      tenantId: tenant.tenantId,
      accion: isUpgrade ? 'PLAN_UPGRADE' : isDowngrade ? 'PLAN_DOWNGRADE' : 'PLAN_CHANGE',
      tablaAfectada: 'suscripciones',
      registroId: subscription.id,
      detalles: JSON.stringify({
        previousPlan: oldPlanName,
        newPlan: plan.nombre,
        price: plan.precioMensual,
        interval: plan.intervalo,
        isUpgrade,
        isDowngrade,
        billingCycleEnd: billingCycleEnd.toISOString(),
      }),
    },
  })

  return {
    ok: true,
    message: isUpgrade ? 'Plan actualizado exitosamente' : isDowngrade ? 'Plan cambiado exitosamente' : 'Plan activado',
    data: {
      id: subscription.id,
      planName: plan.nombre,
      estado: 'ACTIVE',
      billingCycleEnd,
      isUpgrade,
      isDowngrade,
    },
  }
}
