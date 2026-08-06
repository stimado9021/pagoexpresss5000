import { NextResponse } from 'next/server'
import { requireRole, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { listarHistorial } from '@/lib/services/historial-service'

export async function GET(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO)
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)

  try {
    return apiResponse(
      await listarHistorial(session, {
        tabla: searchParams.get('tabla') || undefined,
        limit: parseInt(searchParams.get('limit') || '100'),
        offset: parseInt(searchParams.get('offset') || '0'),
      })
    )
  } catch (error) {
    console.error('[HISTORIAL GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
