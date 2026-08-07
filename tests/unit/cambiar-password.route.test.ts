import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/auth/cambiar-password/route'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const hash = bcrypt.hashSync('clave-actual-123', 10)

function callPost(body: unknown) {
  return POST(
    new Request('http://localhost/api/auth/cambiar-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/auth/cambiar-password', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset()
    vi.mocked(prisma.usuario.findUnique).mockReset()
    vi.mocked(prisma.usuario.update).mockReset()
  })

  it('rechaza sin sesión activa', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await callPost({ passwordActual: 'x', nuevaPassword: 'clave-nueva-123' })
    expect(res.status).toBe(401)
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled()
  })

  it('rechaza si faltan campos', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never)
    const res = await callPost({ passwordActual: '', nuevaPassword: '' })
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('Todos los campos son obligatorios')
  })

  it('rechaza contraseña nueva demasiado corta', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never)
    const res = await callPost({ passwordActual: 'x', nuevaPassword: 'corta' })
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('La nueva contraseña debe tener al menos 8 caracteres')
  })

  it('rechaza si la nueva contraseña es igual a la actual', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never)
    const res = await callPost({ passwordActual: 'clave-actual-123', nuevaPassword: 'clave-actual-123' })
    expect(res.status).toBe(400)
  })

  it('devuelve 404 si el usuario no existe', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 99 } as never)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null)
    const res = await callPost({ passwordActual: 'clave-actual-123', nuevaPassword: 'clave-nueva-123' })
    expect(res.status).toBe(404)
  })

  it('rechaza si la contraseña actual es incorrecta', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 1, password: hash } as never)
    const res = await callPost({ passwordActual: 'incorrecta', nuevaPassword: 'clave-nueva-123' })
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('La contraseña actual es incorrecta')
    expect(prisma.usuario.update).not.toHaveBeenCalled()
  })

  it('actualiza la contraseña con hash cuando todo es válido', async () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 1 } as never)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 1, password: hash } as never)
    vi.mocked(prisma.usuario.update).mockResolvedValue({ id: 1 } as never)

    const res = await POST(
      new Request('http://localhost/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passwordActual: 'clave-actual-123', nuevaPassword: 'clave-nueva-123' }),
      }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)

    const args = vi.mocked(prisma.usuario.update).mock.calls[0]
    const arg = args[0] as { data: { password: string } }
    const nuevaHash = arg.data.password
    expect(nuevaHash).not.toBe(hash)
    expect(bcrypt.compareSync('clave-nueva-123', nuevaHash)).toBe(true)
  })
})
