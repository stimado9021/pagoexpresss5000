import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/session', () => ({
  createSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import { POST } from '@/app/api/auth/login/route'
import { createSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const hash = bcrypt.hashSync('clave-segura-123', 10)

function user(over: Record<string, unknown> = {}) {
  return {
    id: 1, cedula: '123', email: 'juan@example.com', nombre: 'Juan', apellido: 'Pérez',
    rol: 'vendedor', password: hash, activo: 1, tenantId: null,
    ...over,
  } as never
}

function callPost(body: unknown, ip = '192.0.2.1', forwardedHost?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': ip }
  if (forwardedHost) headers['x-forwarded-host'] = forwardedHost
  return POST(
    new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kreditools.shop'
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    vi.mocked(prisma.usuario.findMany).mockReset()
    vi.mocked(prisma.tenant.findUnique).mockReset()
    vi.mocked(prisma.tenant.findMany).mockReset()
    vi.mocked(prisma.tenant.findFirst).mockReset()
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.tenant.findFirst).mockResolvedValue(null)
    vi.mocked(createSession).mockReset()
  })

  it('rechaza peticiones sin correo o contraseña', async () => {
    const res = await callPost({ email: '', password: '' }, '192.0.2.100')
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('Correo y contraseña requeridos')
    expect(prisma.usuario.findMany).not.toHaveBeenCalled()
  })

  it('devuelve 401 si el usuario no existe', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([])
    const res = await callPost({ email: 'nadie@example.com', password: 'x' }, '192.0.2.101')
    expect(res.status).toBe(401)
    expect((await res.json()).message).toBe('Credenciales incorrectas')
  })

  it('devuelve 401 si la contraseña no coincide', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([user()])
    const res = await callPost({ email: 'juan@example.com', password: 'incorrecta' }, '192.0.2.102')
    expect(res.status).toBe(401)
  })

  it('devuelve 403 si el usuario está inactivo', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([user({ activo: 0 })])
    const res = await callPost({ email: 'juan@example.com', password: 'clave-segura-123' }, '192.0.2.103')
    expect(res.status).toBe(403)
    expect((await res.json()).message).toBe('Usuario inactivo')
  })

  it('inicia sesión correctamente y crea la sesión con tenantSlug', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      user({ id: 7, cedula: '52004483', rol: 'empresario', tenantId: 4 }),
    ])
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: 'mitenant' } as never)
    const res = await callPost({ email: 'judyh@example.com', password: 'clave-segura-123' }, '192.0.2.104')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user.rol).toBe('empresario')
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, tenantId: 4, tenantSlug: 'mitenant', rol: 'empresario' }),
    )
  })

  it('busca al usuario por email (ya no por cédula)', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([user({ tenantId: 4 })])
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: 'mitenant' } as never)
    await callPost({ email: 'judyh@example.com', password: 'clave-segura-123' }, '192.0.2.105')
    const where = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as { where: { email?: string } }
    expect(where.where.email).toBe('judyh@example.com')
    expect(where.where).not.toHaveProperty('OR')
  })

  it('una cédula ya no funciona como identificador', async () => {
    const res = await callPost({ identificacion: '52004483', password: 'clave-segura-123' }, '192.0.2.106')
    expect(res.status).toBe(400)
    expect((await res.json()).message).toBe('Correo y contraseña requeridos')
    expect(prisma.usuario.findMany).not.toHaveBeenCalled()
  })

  it('rechaza login en subdominio ajeno aunque la clave sea válida', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([user({ tenantId: 4 })])
    // resolveTenantByHost: slug "otro" existe (id 9)
    vi.mocked(prisma.tenant.findUnique).mockImplementation((async (args: unknown) => {
      const where = (args as { where: { slug?: string; id?: number } }).where
      if (where.slug === 'otro') return { id: 9, slug: 'otro', nombre: 'Otro' } as never
      if (where.id === 4) return { slug: 'mitenant' } as never
      return null
    }) as never)
    const res = await callPost(
      { email: 'juan@example.com', password: 'clave-segura-123' },
      '192.0.2.107',
      'otro.kreditools.shop',
    )
    expect(res.status).toBe(403)
    expect((await res.json()).message).toBe('Esta cuenta pertenece a otro espacio de trabajo')
    expect(createSession).not.toHaveBeenCalled()
  })

  it('desde el apex con correo en varios tenants pide elegir espacio', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      user({ id: 1, tenantId: 4 }),
      user({ id: 2, tenantId: 5 }),
    ])
    vi.mocked(prisma.tenant.findMany).mockResolvedValue([
      { id: 4, slug: 'tenant-a', nombre: 'A' },
      { id: 5, slug: 'tenant-b', nombre: 'B' },
    ] as never)
    const res = await callPost({ email: 'juan@example.com', password: 'clave-segura-123' }, '192.0.2.108')
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.needTenant).toBe(true)
    expect(body.spaces).toHaveLength(2)
    expect(createSession).not.toHaveBeenCalled()
  })
})
