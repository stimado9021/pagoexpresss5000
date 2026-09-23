import 'server-only'
import { SignJWT, jwtVerify } from 'jose'

// Tokens de recuperación: JWT HS256 de 30 min ligados al hash actual
// de la contraseña (ph). Si la clave cambia, el token muere: un solo uso.
const secretKey = process.env.SESSION_SECRET
if (!secretKey) {
  throw new Error('SESSION_SECRET no está configurada. Revisa el archivo .env')
}
const encodedKey = new TextEncoder().encode(secretKey)

export async function createResetToken(userId: number, passwordHash: string): Promise<string> {
  return new SignJWT({ purpose: 'password-reset', userId, ph: passwordHash.slice(0, 24) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(encodedKey)
}

export async function verifyResetToken(token: string): Promise<{ userId: number; ph: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })
    if (payload.purpose !== 'password-reset') return null
    if (typeof payload.userId !== 'number' || typeof payload.ph !== 'string') return null
    return { userId: payload.userId, ph: payload.ph }
  } catch {
    return null
  }
}
