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
    trialDays: 15,
  })
}

export async function processSubscriptionExpiry() {
  const now = new Date()

  // 1) Suscripciones pagas vencidas: ACTIVE con pagadoHasta < now => SUSPENDED/PAST_DUE
  const expired = await prisma.suscripcion.findMany({
    where: {
      estado: 'ACTIVE',
      pagadoHasta: { lt: now },
      tenant: { status: 'ACTIVE' },
    },
    include: { tenant: { select: { id: true } }, plan: { select: { nombre: true } } },
  })

  for (const sub of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.suscripcion.update({
        where: { id: sub.id },
        data: { estado: 'PAST_DUE' },
      })
      await tx.tenant.update({
        where: { id: sub.tenantId },
        data: { status: 'SUSPENDED' },
      })
      const owner = await tx.usuario.findFirst({ where: { tenantId: sub.tenantId, rol: 'empresario', activo: 1 } })
      if (owner) {
        await tx.historial.create({
          data: {
            usuarioId: owner.id,
            tenantId: sub.tenantId,
            accion: 'NOTIFICATION:tenant_suspended',
            tablaAfectada: 'notifications',
            detalles: JSON.stringify({ reason: 'pagadoHasta vencido', pagadoHasta: sub.pagadoHasta, plan: sub.plan?.nombre }),
          },
        })
      }
    })
  }

  // 2) Grace 7 días: SUSPENDED + PAST_DUE con pagadoHasta < now-7d => CANCELLED
  const graceLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const toCancel = await prisma.suscripcion.findMany({
    where: {
      estado: 'PAST_DUE',
      pagadoHasta: { lt: graceLimit },
      tenant: { status: 'SUSPENDED' },
    },
    include: { tenant: true },
  })
  for (const sub of toCancel) {
    await prisma.$transaction(async (tx) => {
      await tx.suscripcion.update({ where: { id: sub.id }, data: { estado: 'CANCELLED' } })
      await tx.tenant.update({ where: { id: sub.tenantId }, data: { status: 'CANCELLED' } })
    })
  }

  return { expired: expired.length, cancelled: toCancel.length }
}

export async function sendRenewalReminders() {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

  const expiring = await prisma.suscripcion.findMany({
    where: {
      estado: 'ACTIVE',
      pagadoHasta: { gte: threeDaysFromNow, lt: fourDaysFromNow },
      tenant: { status: 'ACTIVE' },
    },
    include: { tenant: { include: { usuarios: { where: { rol: 'empresario', activo: 1 } } } }, plan: true },
  })

  for (const sub of expiring) {
    for (const user of sub.tenant.usuarios) {
      await createNotification(sub.tenantId, user.id, 'trial_post_expired', {
        tenantId: sub.tenantId,
        pagadoHasta: sub.pagadoHasta,
        daysRemaining: Math.ceil((sub.pagadoHasta!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        plan: sub.plan?.nombre,
        type: 'renewal_3days',
      })
    }
  }
  return { reminders: expiring.length }
}