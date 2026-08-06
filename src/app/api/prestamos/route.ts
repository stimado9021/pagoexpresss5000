import { NextResponse } from 'next/server'
import { requireRole, requireSession, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { crearPrestamo, listarPrestamos } from '@/lib/services/prestamo-service'

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const data = await request.json()
    return apiResponse(await crearPrestamo(session, data))
  } catch (error) {
    console.error('[PRESTAMOS POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear préstamo' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await requireSession()
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('cliente_id')

  try {
    return apiResponse(
      await listarPrestamos(session, { clienteId: clienteId ? parseInt(clienteId) : undefined })
    )
  } catch {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
