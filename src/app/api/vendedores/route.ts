import { NextResponse } from 'next/server'
import { requireRole, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { crearVendedor, listarVendedores } from '@/lib/services/vendedor-service'

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO)
  if (isErrorResponse(session)) return session

  try {
    const data = await request.json()
    return apiResponse(await crearVendedor(session, data))
  } catch (error) {
    console.error('[VENDEDORES POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear vendedor' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    return apiResponse(await listarVendedores(session, { id: id ? parseInt(id) : undefined }))
  } catch {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
