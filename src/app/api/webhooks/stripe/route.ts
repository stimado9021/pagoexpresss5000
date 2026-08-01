import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe'
import type Stripe from 'stripe'

function daysForInterval(intervalo: string): number {
  return intervalo === 'ANUAL' ? 365 : 30
}

type WebhookObject = {
  id?: string
  customer?: string | null
  subscription?: string | null
  status?: string
  amount_paid?: number | null
  currency?: string | null
  lines?: { data?: Array<{ period?: { end?: number } }> }
  metadata?: Record<string, string>
}

async function findSuscripcionByCustomer(customerId: string) {
  return prisma.suscripcion.findFirst({
    where: { stripeCustomerId: customerId },
    include: { tenant: true },
  })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') || ''
  const webhookSecret = getStripeWebhookSecret()

  let event: Stripe.Event
  try {
    if (webhookSecret) {
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else {
      console.warn('[STRIPE WEBHOOK] Sin STRIPE_WEBHOOK_SECRET, aceptando eventos en modo desarrollo')
      event = JSON.parse(body) as Stripe.Event
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Firma inválida'
    console.error('[STRIPE WEBHOOK VERIFY ERROR]', message)
    return NextResponse.json({ success: false, message }, { status: 400 })
  }

  try {
    const object = event.data?.object as unknown as WebhookObject

    switch (event.type) {
      case 'checkout.session.completed': {
        const tenantId = object?.metadata?.tenantId
        const planId = object?.metadata?.planId
        const intervalo = object?.metadata?.intervalo === 'ANUAL' ? 'ANUAL' : 'MONTHLY'
        const customerId = object?.customer
        const subscriptionId = object?.subscription
        if (!customerId || !subscriptionId) {
          return NextResponse.json({ success: false, message: 'Sin datos de suscripción' }, { status: 400 })
        }

        const id = tenantId ? parseInt(tenantId) : null
        const suscripcion = id
          ? await prisma.suscripcion.findUnique({ where: { tenantId: id } })
          : await findSuscripcionByCustomer(customerId)

        const targetTenantId = suscripcion?.tenantId ?? id
        if (!targetTenantId) {
          return NextResponse.json({ success: false, message: 'Tenant no encontrado' }, { status: 404 })
        }

        const targetPlanId = planId ? parseInt(planId) : suscripcion?.planId
        if (!targetPlanId) {
          return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 })
        }

        const now = new Date()
        const pagadoHasta = new Date(now.getTime() + daysForInterval(intervalo) * 24 * 60 * 60 * 1000)

        const empresario = await prisma.usuario.findFirst({
          where: { tenantId: targetTenantId, rol: 'empresario' },
        })

        await prisma.$transaction(async (tx) => {
          await tx.suscripcion.upsert({
            where: { tenantId: targetTenantId },
            update: {
              planId: targetPlanId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              intervalo,
              estado: 'ACTIVE',
              renovacionProxima: pagadoHasta,
              pagadoHasta,
            },
            create: {
              tenantId: targetTenantId,
              planId: targetPlanId,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              intervalo,
              estado: 'ACTIVE',
              renovacionProxima: pagadoHasta,
              pagadoHasta,
            },
          })

          await tx.tenant.update({
            where: { id: targetTenantId },
            data: {
              planId: targetPlanId,
              status: 'ACTIVE',
              planStartsAt: now,
              planExpiresAt: pagadoHasta,
            },
          })

          if (empresario) {
            await tx.historial.create({
              data: {
                usuarioId: empresario.id,
                tenantId: targetTenantId,
                accion: 'CHECKOUT_COMPLETED',
                tablaAfectada: 'suscripciones',
                detalles: JSON.stringify({ customerId, subscriptionId, planId: targetPlanId, intervalo }),
              },
            })
          }
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const customerId = object?.customer
        const subscriptionId = object?.subscription
        const periodEnd = object?.lines?.data?.[0]?.period?.end
          ? new Date(object.lines.data[0].period.end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

        let suscripcion = subscriptionId
          ? await prisma.suscripcion.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
              include: { tenant: true },
            })
          : null
        if (!suscripcion && customerId) suscripcion = await findSuscripcionByCustomer(customerId)
        if (!suscripcion) {
          return NextResponse.json({ success: false, message: 'Suscripción no encontrada' }, { status: 404 })
        }

        const user = await prisma.usuario.findFirst({ where: { tenantId: suscripcion.tenantId, rol: 'empresario' } })
        const planStartsAt = suscripcion.tenant.planStartsAt || new Date()

        await prisma.$transaction(async (tx) => {
          await tx.suscripcion.update({
            where: { id: suscripcion.id },
            data: {
              estado: 'ACTIVE',
              cicloActual: { increment: 1 },
              pagadoHasta: periodEnd,
              renovacionProxima: periodEnd,
            },
          })

          await tx.tenant.update({
            where: { id: suscripcion.tenantId },
            data: { status: 'ACTIVE', planExpiresAt: periodEnd, planStartsAt },
          })

          if (user) {
            await tx.historial.create({
              data: {
                usuarioId: user.id,
                tenantId: suscripcion.tenantId,
                accion: 'PAYMENT_RECEIVED',
                tablaAfectada: 'suscripciones',
                registroId: suscripcion.id,
                detalles: JSON.stringify({
                  amount: object?.amount_paid ?? null,
                  currency: object?.currency ?? null,
                  subscriptionId,
                }),
              },
            })
          }
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscriptionId = object?.id
        if (!subscriptionId) break
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })
        if (suscripcion) {
          await prisma.suscripcion.update({
            where: { id: suscripcion.id },
            data: { estado: 'CANCELLED' },
          })
          await prisma.tenant.update({
            where: { id: suscripcion.tenantId },
            data: { status: 'CANCELLED' },
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscriptionId = object?.id
        const status = object?.status
        if (!subscriptionId) break
        const nuevoEstado =
          status === 'past_due' ? 'PAST_DUE' :
          status === 'canceled' ? 'CANCELLED' :
          status === 'active' || status === 'trialing' ? 'ACTIVE' : null
        if (!nuevoEstado) break
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })
        if (suscripcion) {
          await prisma.suscripcion.update({ where: { id: suscripcion.id }, data: { estado: nuevoEstado } })
          if (nuevoEstado === 'CANCELLED') {
            await prisma.tenant.update({ where: { id: suscripcion.tenantId }, data: { status: 'CANCELLED' } })
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ success: true, received: true })
  } catch (error) {
    console.error('[STRIPE WEBHOOK ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error procesando el webhook' }, { status: 500 })
  }
}
