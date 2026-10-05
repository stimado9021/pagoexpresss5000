import bcrypt from 'bcryptjs'
import 'server-only'

const MIN_PASSWORD_LENGTH = 8

export function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` }
  }
  return { valid: true, message: 'Contraseña válida' }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}