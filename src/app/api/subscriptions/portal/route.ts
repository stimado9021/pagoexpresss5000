import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getStripe, APP_URL } from '@/lib/stripe'

export async function POST() {
  const session = await getSession()
  if (!session || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const suscripcion = await prisma.suscripcion.findUnique({
      where: { tenantId: session.tenantId },
    })
    if (!suscripcion?.stripeCustomerId) {
      return NextResponse.json({
        success: false,
        message: 'Aún no tienes un método de pago activo. Inicia un checkout primero.',
      }, { status: 400 })
    }

    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: suscripcion.stripeCustomerId,
      return_url: `${APP_URL}/empresario/billing`,
    })

    return NextResponse.json({ success: true, url: portal.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al abrir el portal de pagos'
    console.error('[PORTAL ERROR]', message)
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
