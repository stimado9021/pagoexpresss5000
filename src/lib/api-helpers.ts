import 'server-only'
import { NextResponse } from 'next/server'
import { getSession } from './session'
import { prisma } from './prisma'
import type { SessionPayload } from './session'
import type { Resultado } from './services/types'

export type ApiSession = SessionPayload

export const UNAUTHORIZED = NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
export const FORBIDDEN = NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })

async function validateActiveUser(session: SessionPayload): Promise<ApiSession | NextResponse> {
  const user = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { activo: true, rol: true },
  })
  if (!user || user.activo !== 1 || user.rol !== session.rol) return UNAUTHORIZED
  return session
}

export async function requireSession(): Promise<ApiSession | NextResponse> {
  const session = await getSession()
  if (!session) return UNAUTHORIZED
  return validateActiveUser(session)
}

export async function requireRole(...roles: string[]): Promise<ApiSession | NextResponse> {
  const session = await getSession()
  if (!session) return UNAUTHORIZED
  if (!roles.includes(session.rol)) return FORBIDDEN
  return validateActiveUser(session)
}

export function isErrorResponse<T>(value: T | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export function apiResponse<T>(result: Resultado<T>): NextResponse {
  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: result.status })
  }
  return NextResponse.json(
    { success: true, message: result.message ?? '', data: result.data, ...(result.total !== undefined ? { total: result.total } : {}) },
    { status: result.status ?? 200 }
  )
}

export function tenantScope(session: ApiSession): { tenantId?: number; clienteId?: number; vendedorId?: number } | undefined {
  if (session.rol === 'superadmin') return undefined
  return { tenantId: session.tenantId }
}

export const ROLES = {
  SUPERADMIN: 'superadmin',
  EMPRESARIO: 'empresario',
  VENDEDOR: 'vendedor',
  CLIENTE: 'cliente',
} as const
