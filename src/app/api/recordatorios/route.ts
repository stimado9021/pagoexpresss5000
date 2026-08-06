import { NextResponse } from 'next/server'
import { requireRole, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { enviarRecordatorios } from '@/lib/services/recordatorio-service'

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  const ip = getClientIp(request)
  if (!rateLimit(`recordatorios:${session.userId}:${ip}`, 2, 60_000)) {
    return NextResponse.json(
      { success: false, message: 'Demasiados envíos. Intenta de nuevo en un momento.' },
      { status: 429 }
    )
  }

  try {
    return apiResponse(await enviarRecordatorios(session))
  } catch (error) {
    console.error('[RECORDATORIOS ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
