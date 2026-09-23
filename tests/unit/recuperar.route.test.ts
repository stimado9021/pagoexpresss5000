import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/mail', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  layoutHtml: (b: string) => b,
  appUrl: 'https://kreditools.shop',
}))

import { sendEmail } from '@/lib/mail'
import { prisma } from '@/lib/prisma'

process.env.SESSION_SECRET ??= 'test-secret-para-recuperacion-1234567890'
process.env.NEXT_PUBLIC_APP_URL = 'https://kreditools.shop'
delete process.env.NEXT_PUBLIC_ROOT_DOMAIN

const { POST: recuperar } = await import('@/app/api/auth/recuperar/route')
const { POST: restablecer } = await import('@/app/api/auth/restablecer/route')
const { createResetToken } = await import('@/lib/reset-token')

const hash = bcrypt.hashSync('clave-vieja-123', 10)

function callRecuperar(email: unknown, ip = '192.0.2.50') {
  return recuperar(
    new Request('http://localhost/api/auth/recuperar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ email }),
    }),
  )
}

function callRestablecer(body: unknown, ip = '192.0.2.51') {
  return restablecer(
    new Request('http://localhost/api/auth/restablecer', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/auth/recuperar', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findMany).mockReset()
    vi.mocked(prisma.usuario.findUnique).mockReset()
    vi.mocked(sendEmail).mockClear()
  })

  it('responde éxito genérico aunque el correo no exista (no enumera)', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([])
    const res = await callRecuperar('nadie@example.com')
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('envía un correo por cada cuenta activa con ese email', async () => {
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([
      { id: 1, nombre: 'A', apellido: '', email: 'a@example.com', rol: 'vendedor' },
      { id: 2, nombre: 'B', apellido: '', email: 'a@example.com', rol: 'cliente' },
    ] as never)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ password: hash } as never)
    const res = await callRecuperar('a@example.com')
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(2)
    const html = vi.mocked(sendEmail).mock.calls[0][0].html as string
    expect(html).toContain('/restablecer?token=')
  })
})

describe('POST /api/auth/restablecer', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findUnique).mockReset()
    vi.mocked(prisma.usuario.update).mockReset()
    vi.mocked(prisma.tenant.findUnique).mockReset()
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
  })

  it('rechaza token inválido y clave corta', async () => {
    const r1 = await callRestablecer({ token: 'no-es-token', nuevaPassword: 'clave-nueva-123' })
    expect(r1.status).toBe(400)
    const r2 = await callRestablecer({ token: 'x', nuevaPassword: 'corta' })
    expect(r2.status).toBe(400)
    expect(prisma.usuario.update).not.toHaveBeenCalled()
  })

  it('actualiza la clave con token válido y devuelve loginUrl', async () => {
    const token = await createResetToken(7, hash)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 7, password: hash, activo: 1, tenantId: 4 } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ slug: 'mitenant' } as never)
    const res = await callRestablecer({ token, nuevaPassword: 'clave-nueva-123' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.loginUrl).toBe('https://mitenant.kreditools.shop/login')
    const arg = vi.mocked(prisma.usuario.update).mock.calls[0][0] as { data: { password: string } }
    expect(await bcrypt.compare('clave-nueva-123', arg.data.password)).toBe(true)
  })

  it('token de un solo uso: muere si la clave ya cambió', async () => {
    const token = await createResetToken(7, hash)
    const otroHash = bcrypt.hashSync('otra-clave-999', 10)
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 7, password: otroHash, activo: 1, tenantId: 4 } as never)
    const res = await callRestablecer({ token, nuevaPassword: 'clave-nueva-123' })
    expect(res.status).toBe(400)
    expect(prisma.usuario.update).not.toHaveBeenCalled()
  })
})
