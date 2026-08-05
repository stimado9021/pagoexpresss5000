import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}))

import { GET } from '@/app/api/auth/subdominio/route'
import { prisma } from '@/lib/prisma'

function callGet(slug: string | null) {
  const url = new URL('http://localhost/api/auth/subdominio')
  if (slug !== null) url.searchParams.set('slug', slug)
  return GET(new Request(url))
}

describe('GET /api/auth/subdominio', () => {
  beforeEach(() => {
    vi.mocked(prisma.tenant.findUnique).mockReset()
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
  })

  it('rechaza slugs demasiado cortos', async () => {
    const res = await callGet('ab')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.available).toBe(false)
    expect(body.reason).toBe('Muy corto')
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('rechaza slugs reservados', async () => {
    for (const slug of ['admin', 'api', 'www', 'app']) {
      const res = await callGet(slug)
      const body = await res.json()
      expect(body.available).toBe(false)
      expect(body.reason).toBe('Reservado')
    }
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('normaliza el slug (mayúsculas, acentos, espacios y símbolos)', async () => {
    const res = await callGet('  Créditos Del Valle!  ')
    const body = await res.json()
    expect(body.slug).toBe('creditos-del-valle')
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { slug: 'creditos-del-valle' } })
  })

  it('limita a 60 caracteres', async () => {
    const res = await callGet('a'.repeat(80))
    const body = await res.json()
    expect(body.slug.length).toBe(60)
  })

  it('marca como disponible cuando el slug no existe', async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)
    const res = await callGet('creditosdelvalle')
    const body = await res.json()
    expect(body.available).toBe(true)
    expect(body.reason).toBe('Disponible')
  })

  it('marca como usado cuando el slug ya existe', async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ id: 1 } as never)
    const res = await callGet('creditosdelvalle')
    const body = await res.json()
    expect(body.available).toBe(false)
    expect(body.reason).toBe('Ya está en uso')
  })
})
