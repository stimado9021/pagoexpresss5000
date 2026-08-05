import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  const subscription = await prisma.suscripcion.findUnique({
    where: { tenantId: session.tenantId },
    include: { plan: { include: { limietes: true } } },
  })

  if (!subscription) {
    return NextResponse.json({ success: false, message: 'Sin suscripci�n' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
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
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { planId } = body

    if (!planId) {
      return NextResponse.json({ success: false, message: 'planId requerido' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } })
    if (!plan || !plan.activo) {
      return NextResponse.json({ success: false, message: 'Plan no encontrado' }, { status: 404 })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      include: { plan: true },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, message: 'Tenant no encontrado' }, { status: 404 })
    }

    const isUpgrade = plan.precioMensual > (tenant.plan?.precioMensual ?? 0)
    const isDowngrade = plan.precioMensual < (tenant.plan?.precioMensual ?? 0)

    const now = new Date()
    const billingCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const subscription = await prisma.suscripcion.upsert({
      where: { tenantId: session.tenantId },
      update: {
        planId,
        estado: 'ACTIVE',
        cicloActual: 1,
        renovacionProxima: billingCycleEnd,
        pagadoHasta: billingCycleEnd,
      },
      create: {
        tenantId: session.tenantId,
        planId,
        estado: 'ACTIVE',
        cicloActual: 1,
        renovacionProxima: billingCycleEnd,
        pagadoHasta: billingCycleEnd,
      },
      include: { plan: { include: { limietes: true } } },
    })

    await prisma.tenant.update({
      where: { id: session.tenantId },
      data: {
        planId,
        status: 'ACTIVE',
        planStartsAt: now,
        planExpiresAt: billingCycleEnd,
      },
    })

    const oldPlanName = tenant.plan?.nombre ?? 'NINGUNO'

    await prisma.historial.create({
      data: {
        usuarioId: session.userId,
        tenantId: session.tenantId,
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

    return NextResponse.json({
      success: true,
      message: isUpgrade ? 'Plan actualizado exitosamente' : isDowngrade ? 'Plan cambiado exitosamente' : 'Plan activado',
      data: {
        id: subscription.id,
        planName: plan.nombre,
        estado: 'ACTIVE',
        billingCycleEnd,
        isUpgrade,
        isDowngrade,
      },
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ success: false, message: 'Error al procesar la suscripci�n' }, { status: 500 })
  }
}