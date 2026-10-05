import 'server-only'
import { createHash, randomBytes } from 'crypto'

const codes = new Map<string, { code: string; expiresAt: number }>()

const CODE_EXPIRY_MS = 5 * 60 * 1000
const CODE_LENGTH = 6

export function generate2FACode(userId: number): string {
  const code = randomBytes(CODE_LENGTH).toString('hex').slice(0, CODE_LENGTH).toUpperCase()
  codes.set(String(userId), { code, expiresAt: Date.now() + CODE_EXPIRY_MS })
  return code
}

export function verify2FACode(userId: number, code: string): boolean {
  const entry = codes.get(String(userId))
  if (!entry) return false
  if (entry.expiresAt < Date.now()) {
    codes.delete(String(userId))
    return false
  }
  const valid = entry.code === code.toUpperCase()
  if (valid) codes.delete(String(userId))
  return valid
}

export function cleanupExpiredCodes(): void {
  const now = Date.now()
  for (const [key, entry] of codes) {
    if (entry.expiresAt < now) codes.delete(key)
  }
}
