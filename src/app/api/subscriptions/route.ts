import { NextResponse } from 'next/server'
import { requireRole, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { getSuscripcion, cambiarPlan } from '@/lib/services/subscription-service'

export async function GET() {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO)
  if (isErrorResponse(session)) return session

  try {
    return apiResponse(await getSuscripcion(session))
  } catch (error) {
    console.error('[SUBSCRIPTIONS GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN)
  if (isErrorResponse(session)) return session

  try {
    const body = await request.json()
    if (!body?.tenantId) {
      return NextResponse.json({ success: false, message: 'tenantId requerido (solo superadmin puede asignar planes sin pago)' }, { status: 400 })
    }
    const targetSession = { ...session, tenantId: Number(body.tenantId) }
    return apiResponse(await cambiarPlan(targetSession, body.planId))
  } catch (error) {
    console.error('[SUBSCRIPTIONS POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al procesar la suscripción' }, { status: 500 })
  }
}
