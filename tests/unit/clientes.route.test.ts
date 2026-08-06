import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    prestamo: {
      findMany: vi.fn(),
    },
  },
}))

import { GET } from '@/app/api/clientes/route'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const clientesMock = [
  {
    id: 10,
    cedula: '1001',
    nombre: 'Ana',
    apellido: 'Gómez',
    telefono: null,
    email: null,
    direccion: null,
    activo: 1,
    createdAt: new Date(),
    prestamosCliente: [
      { estado: 'activo', montoSolicitado: '1000000', montoPagado: '200000', saldoPendiente: '800000', cuotaDiaria: '50000', diasAtrasados: 0, fechaInicio: new Date(), fechaUltimoPago: new Date(), montoTotal: '1100000' },
    ],
  },
]

function callGet(params: Record<string, string>, session: unknown) {
  const url = new URL('http://localhost/api/clientes')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  vi.mocked(getSession).mockResolvedValue(session as never)
  if (session) {
    const rol = (session as { rol: string }).rol
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ activo: 1, rol } as never)
  }
  return GET(new Request(url))
}

describe('GET /api/clientes?vendedor_id= (empresario viendo clientes de su vendedor)', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findMany).mockReset()
    vi.mocked(prisma.usuario.findMany).mockResolvedValue(clientesMock as never)
    vi.mocked(prisma.usuario.findUnique).mockReset()
  })

  it('regresión: el empresario SÍ puede listar clientes de un vendedor (bug spinner infinito)', async () => {
    const res = await callGet({ vendedor_id: '7' }, { rol: 'empresario', tenantId: 4, userId: 9 })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rol: 'cliente', vendedorId: 7, tenantId: 4 },
      }),
    )
  })

  it('filtra por tenant del empresario (no mezcla carteras entre tenants)', async () => {
    await callGet({ vendedor_id: '7' }, { rol: 'empresario', tenantId: 4, userId: 9 })
    const call = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as { where: { tenantId?: number } }
    expect(call.where.tenantId).toBe(4)
  })

  it('el superadmin también puede consultar por vendedor (sin filtro de tenant)', async () => {
    const res = await callGet({ vendedor_id: '7' }, { rol: 'superadmin' })
    expect(res.status).toBe(200)
    const call = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as { where: { tenantId?: number } }
    expect(call.where.tenantId).toBeUndefined()
  })

  it('devuelve 401 sin sesión', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await callGet({ vendedor_id: '7' }, null)
    expect(res.status).toBe(401)
  })

  it('un vendedor NO puede usar vendedor_id para ver clientes de otros (parámetros inválidos)', async () => {
    const res = await callGet({ vendedor_id: '7' }, { rol: 'vendedor', userId: 3 })
    expect(res.status).toBe(400)
    expect(prisma.usuario.findMany).not.toHaveBeenCalled()
  })
})
