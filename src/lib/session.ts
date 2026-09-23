import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Sesión de 1 hora por inactividad (deslizante: el proxy la renueva
// en cada request autenticado; 1h sin actividad => expira).
export const SESSION_DURATION_MS = 60 * 60 * 1000
export const SESSION_DURATION_JWT = '1h' as const

const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
  throw new Error('SESSION_SECRET no está configurada. Revisa el archivo .env')
}
const encodedKey = new TextEncoder().encode(secretKey)

export type SessionPayload = {
  userId: number
  cedula: string
  rol: string
  nombre: string
  apellido: string
  tenantId?: number
  tenantSlug?: string
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION_JWT)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function createSession(user: { id: number; cedula: string; rol: string; nombre: string; apellido: string; tenantId?: number | null; tenantSlug?: string | null }) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const session = await encrypt({ userId: user.id, cedula: user.cedula, rol: user.rol, nombre: user.nombre, apellido: user.apellido, tenantId: user.tenantId ?? undefined, tenantSlug: user.tenantSlug ?? undefined, expiresAt })
  const cookieStore = await cookies()

  // Dominio compartido (.midominio.com) para SSO entre el apex y los
  // subdominios de cada tenant. En localhost/IP se omite (host-only).
  const { getSessionCookieDomain } = await import('./domains')
  const domain = getSessionCookieDomain()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    maxAge: SESSION_DURATION_MS / 1000,
    sameSite: 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  })
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const { getSessionCookieDomain } = await import('./domains')
  const domain = getSessionCookieDomain()
  // Borrar con el mismo path/domain con el que se creó (si no, en prod
  // con dominio compartido `.kreditools.shop` la cookie no se limpia).
  try {
    cookieStore.delete({ name: 'session', path: '/', ...(domain ? { domain } : {}) } as never)
  } catch {
    cookieStore.delete('session')
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value
  if (!sessionCookie) return null
  return await decrypt(sessionCookie)
}
