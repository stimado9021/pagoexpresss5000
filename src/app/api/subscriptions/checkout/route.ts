import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getStripe, APP_URL } from '@/lib/stripe'
import { createPaymentLink, buildReference, isWompiConfigured } from '@/lib/wompi'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const { planId, intervalo, paymentMethod = 'stripe' } = await request.json()
    if (!planId || !['MONTHLY', 'ANUAL'].includes(intervalo)) {
      return NextResponse.json({ success: false, message: 'planId e intervalo requeridos' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({ where: { id: parseInt(planId) } })
    if (!plan || !plan.activo) {
      return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 })
    }

    if (paymentMethod === 'wompi') {
      if (!isWompiConfigured()) {
        return NextResponse.json({
          success: false,
          message: 'Wompi no está configurado. Revisa las variables WOMPI_* en el .env.',
        }, { status: 400 })
      }

      const precio = intervalo === 'ANUAL'
        ? Number(plan.precioAnual ?? plan.precioMensual)
        : Number(plan.precioMensual)
      const amountInCents = Math.round(precio * 100)
      const reference = buildReference(session.tenantId, plan.id, intervalo)

      const link = await createPaymentLink({
        name: `Suscripción PagoExpress - Plan ${plan.nombre}`,
        description: `Plan ${plan.nombre} (${intervalo === 'ANUAL' ? 'anual' : 'mensual'}) para ${session.tenantId}`,
        amountInCents,
        reference,
        redirectUrl: `${APP_URL}/empresario/billing?checkout=success`,
      })

      return NextResponse.json({ success: true, url: link.url })
    }

    const priceId = intervalo === 'ANUAL' ? plan.stripePriceAnualId : plan.stripePriceMensualId
    if (!priceId) {
      return NextResponse.json({
        success: false,
        message: `El plan "${plan.nombre}" aún no tiene configurado un Precio de Stripe (${intervalo}). Agrega STRIPE_SECRET_KEY y los Price IDs en la base de datos.`,
      }, { status: 400 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { suscripciones: true },
    })
    if (!tenant) {
      return NextResponse.json({ success: false, message: 'Tenant no encontrado' }, { status: 404 })
    }

    const suscripcion = tenant.suscripciones[0]
    const stripe = getStripe()

    const trialEndUnix = tenant.status === 'TRIAL' && tenant.trialEndsAt > new Date()
      ? Math.floor(tenant.trialEndsAt.getTime() / 1000)
      : null

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: suscripcion?.stripeCustomerId || undefined,
      customer_creation: suscripcion?.stripeCustomerId ? undefined : 'always',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        tenantId: String(tenant.id),
        planId: String(plan.id),
        intervalo,
      },
      subscription_data: trialEndUnix
        ? { trial_end: trialEndUnix, metadata: { tenantId: String(tenant.id) } }
        : { metadata: { tenantId: String(tenant.id) } },
      success_url: `${APP_URL}/empresario/billing?checkout=success`,
      cancel_url: `${APP_URL}/empresario/billing?checkout=canceled`,
      allow_promotion_codes: true,
    })

    if (suscripcion && !suscripcion.stripeCustomerId && checkout.customer) {
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: { stripeCustomerId: String(checkout.customer) },
      })
    }

    return NextResponse.json({ success: true, url: checkout.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    console.error('[CHECKOUT ERROR]', message)
    const friendly = message.includes('STRIPE_SECRET_KEY')
      ? 'Falta configurar STRIPE_SECRET_KEY en el .env'
      : 'Error al iniciar el pago. Verifica tu integración con Stripe.'
    return NextResponse.json({ success: false, message: friendly }, { status: 500 })
  }
}
