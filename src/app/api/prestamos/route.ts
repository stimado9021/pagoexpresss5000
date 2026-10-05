import { NextResponse } from 'next/server'
import { requireRole, requireSession, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { crearPrestamo, listarPrestamos } from '@/lib/services/prestamo-service'

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const data = await request.json()
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, message: 'Datos inválidos' }, { status: 400 })
    }
    if (!data.cliente_id || typeof data.cliente_id !== 'number') {
      return NextResponse.json({ success: false, message: 'cliente_id es requerido' }, { status: 400 })
    }
    if (!data.monto || typeof data.monto !== 'number' || data.monto <= 0) {
      return NextResponse.json({ success: false, message: 'monto debe ser un número positivo' }, { status: 400 })
    }
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
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const response = apiResponse(
      await listarPrestamos(session, { clienteId: clienteId ? parseInt(clienteId) : undefined, limit, offset })
    )
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
