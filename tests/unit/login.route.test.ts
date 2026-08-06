import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/session', () => ({
  createSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findFirst: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/auth/login/route'
import { createSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const hash = bcrypt.hashSync('clave-segura-123', 10)

function callPost(body: unknown, ip = '192.0.2.1') {
  return POST(
    new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findFirst).mockReset()
    vi.mocked(createSession).mockReset()
  })

  it('rechaza peticiones sin correo o contraseña', async () => {
    const res = await callPost({ email: '', password: '' }, '192.0.2.100')
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('Correo y contraseña requeridos')
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled()
  })

  it('devuelve 401 si el usuario no existe', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null)
    const res = await callPost({ email: 'nadie@example.com', password: 'x' }, '192.0.2.101')
    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Credenciales incorrectas')
  })

  it('devuelve 401 si la contraseña no coincide', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: 1, cedula: '123', email: 'juan@example.com', nombre: 'Juan', apellido: 'Pérez',
      rol: 'vendedor', password: hash, activo: 1, tenantId: null,
    } as never)
    const res = await callPost({ email: 'juan@example.com', password: 'incorrecta' }, '192.0.2.102')
    expect(res.status).toBe(401)
  })

  it('devuelve 403 si el usuario está inactivo', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: 1, cedula: '123', email: 'juan@example.com', nombre: 'Juan', apellido: 'Pérez',
      rol: 'vendedor', password: hash, activo: 0, tenantId: null,
    } as never)
    const res = await callPost({ email: 'juan@example.com', password: 'clave-segura-123' }, '192.0.2.103')
    expect(res.status).toBe(403)
    expect((await res.json()).message).toBe('Usuario inactivo')
  })

  it('inicia sesión correctamente y crea la sesión', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: 7, cedula: '52004483', email: 'judyh@example.com', nombre: 'Judith', apellido: 'Yepes',
      rol: 'empresario', password: hash, activo: 1, tenantId: 4,
    } as never)
    const res = await callPost({ email: 'judyh@example.com', password: 'clave-segura-123' }, '192.0.2.104')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user.rol).toBe('empresario')
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, tenantId: 4, rol: 'empresario' }),
    )
  })

  it('busca al usuario únicamente por email (ya no por cédula)', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({
      id: 7, cedula: '52004483', email: 'judyh@example.com', nombre: 'Judith', apellido: 'Yepes',
      rol: 'empresario', password: hash, activo: 1, tenantId: 4,
    } as never)
    await callPost({ email: 'judyh@example.com', password: 'clave-segura-123' }, '192.0.2.105')
    const where = vi.mocked(prisma.usuario.findFirst).mock.calls[0][0] as { where: { email?: string } }
    expect(where.where.email).toBe('judyh@example.com')
    expect(where.where).not.toHaveProperty('OR')
  })

  it('una cédula ya no funciona como identificador', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null)
    const res = await callPost({ identificacion: '52004483', password: 'clave-segura-123' }, '192.0.2.106')
    expect(res.status).toBe(401)
    const where = vi.mocked(prisma.usuario.findFirst).mock.calls[0][0] as { where: { email?: string } }
    expect(where.where.email).toBe('52004483')
  })
})
