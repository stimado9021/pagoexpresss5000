import { NextResponse } from 'next/server'
import { requireRole, requireSession, isErrorResponse, apiResponse, ROLES } from '@/lib/api-helpers'
import { crearCliente, actualizarCliente, listarClientes, type ClienteQuery } from '@/lib/services/cliente-service'

export async function GET(request: Request) {
  const session = await requireSession()
  if (isErrorResponse(session)) return session

  const { searchParams } = new URL(request.url)
  const query: ClienteQuery = {}
  for (const key of ['rol', 'buscar', 'id', 'resumen', 'cliente_id', 'vendedor_id']) {
    const value = searchParams.get(key)
    if (value) query[key as keyof ClienteQuery] = value
  }

  return apiResponse(await listarClientes(session, query))
}

export async function POST(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const datos = await request.json()
    return apiResponse(await crearCliente(session, datos))
  } catch (error) {
    console.error('[CLIENTES POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear cliente' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireRole(ROLES.SUPERADMIN, ROLES.EMPRESARIO, ROLES.VENDEDOR)
  if (isErrorResponse(session)) return session

  try {
    const datos = await request.json()
    return apiResponse(await actualizarCliente(session, datos))
  } catch (error) {
    console.error('[CLIENTES PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al actualizar cliente' }, { status: 500 })
  }
}
