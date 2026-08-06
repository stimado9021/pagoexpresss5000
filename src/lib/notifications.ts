import 'server-only'
import { prisma } from './prisma'

export type NotificationEvent =
  | 'trial_welcome'
  | 'trial_3days'
  | 'trial_expired'
  | 'trial_post_expired'
  | 'limit_reached'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'tenant_suspended'
  | 'tenant_reactivated'

export async function createNotification(
  tenantId: number,
  userId: number,
  event: NotificationEvent,
  data: Record<string, unknown> = {}
) {
  await prisma.historial.create({
    data: {
      usuarioId: userId,
      tenantId,
      accion: `NOTIFICATION:${event}`,
      tablaAfectada: 'notifications',
      detalles: JSON.stringify(data),
    },
  })
}

export async function sendTrialReminders() {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const expiringTenants = await prisma.tenant.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: {
        gte: threeDaysFromNow,
        lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: { usuarios: { where: { rol: 'empresario', activo: 1 } } },
  })

  for (const tenant of expiringTenants) {
    for (const user of tenant.usuarios) {
      await createNotification(tenant.id, user.id, 'trial_3days', {
        tenantId: tenant.id,
        trialEndsAt: tenant.trialEndsAt,
        daysRemaining: Math.ceil(
          (tenant.trialEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      })
    }
  }

  const expiredTenants = await prisma.tenant.findMany({
    where: {
      status: 'TRIAL',
      trialEndsAt: { lt: new Date() },
    },
    include: { usuarios: { where: { rol: 'empresario', activo: 1 } } },
  })

  for (const tenant of expiredTenants) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'TRIAL_EXPIRED' },
    })
    for (const user of tenant.usuarios) {
      await createNotification(tenant.id, user.id, 'trial_expired', {
        tenantId: tenant.id,
      })
    }
  }
}

export async function notifyWelcome(tenantId: number, userId: number, tenantName: string) {
  await createNotification(tenantId, userId, 'trial_welcome', {
    tenantId,
    tenantName,
    trialDays: 14,
  })
}