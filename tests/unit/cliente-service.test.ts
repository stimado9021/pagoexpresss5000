import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tenant', () => ({
  checkTenantActive: vi.fn().mockResolvedValue({ ok: true }),
  checkTenantLimit: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    usuario: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    prestamo: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/prestamo-utils', () => ({
  calcularDiasAtrasados: (p: { diasAtrasados?: number }) => Number(p.diasAtrasados ?? 0),
}))

import { listarClientes, crearCliente } from '@/lib/services/cliente-service'
import { prisma } from '@/lib/prisma'

function session(rol: string, extra: Record<string, unknown> = {}) {
  return { rol, userId: 9, tenantId: undefined, ...extra } as never
}

describe('listarClientes (dispatch por consulta / OCP)', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findMany).mockReset()
    vi.mocked(prisma.prestamo.findMany).mockReset()
    vi.mocked(prisma.usuario.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.prestamo.findMany).mockResolvedValue([] as never)
  })

  it('vendedor con resumen: solo sus propios clientes', async () => {
    await listarClientes(session('vendedor'), { resumen: '1' })
    const call = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as { where: { vendedorId?: number } }
    expect(call.where.vendedorId).toBe(9)
  })

  it('empresario con vendedor_id: clientes de ese vendedor dentro de su tenant', async () => {
    await listarClientes(session('empresario', { tenantId: 4 }), { vendedor_id: '7' })
    const call = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as {
      where: { vendedorId?: number; tenantId?: number }
    }
    expect(call.where.vendedorId).toBe(7)
    expect(call.where.tenantId).toBe(4)
  })

  it('superadmin con rol: listado global sin tenant', async () => {
    await listarClientes(session('superadmin'), { rol: 'cliente' })
    const call = vi.mocked(prisma.usuario.findMany).mock.calls[0][0] as { where: { rol?: string; tenantId?: number } }
    expect(call.where.rol).toBe('cliente')
    expect(call.where.tenantId).toBeUndefined()
  })

  it('empresario con rol: parámetros inválidos (solo superadmin usa rol)', async () => {
    const res = await listarClientes(session('empresario', { tenantId: 4 }), { rol: 'cliente' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(400)
    expect(prisma.usuario.findMany).not.toHaveBeenCalled()
  })

  it('sin parámetros: 400', async () => {
    const res = await listarClientes(session('empresario', { tenantId: 4 }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(400)
  })
})

describe('crearCliente', () => {
  beforeEach(() => {
    vi.mocked(prisma.usuario.findUnique).mockReset()
    vi.mocked(prisma.usuario.create).mockReset()
  })

  it('cédula duplicada: 400 y no crea', async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: 1 } as never)
    const res = await crearCliente(session('vendedor', { tenantId: 4 }), { nombre: 'Ana', cedula: '1001' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(400)
    expect(prisma.usuario.create).not.toHaveBeenCalled()
  })
})
