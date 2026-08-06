import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    prestamo: { findMany: vi.fn() },
    usuario: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/prestamo-utils', () => ({
  calcularDiasAtrasados: (p: { diasAtrasados?: number }) => Number(p.diasAtrasados ?? 0),
}))

import { listarPrestamos } from '@/lib/services/prestamo-service'
import { prisma } from '@/lib/prisma'

function session(rol: string, extra: Record<string, unknown> = {}) {
  return { rol, userId: 9, tenantId: undefined, ...extra } as never
}

describe('listarPrestamos (estrategia por rol / OCP)', () => {
  beforeEach(() => {
    vi.mocked(prisma.prestamo.findMany).mockReset()
    vi.mocked(prisma.usuario.findFirst).mockReset()
    vi.mocked(prisma.prestamo.findMany).mockResolvedValue([] as never)
  })

  it('superadmin: consulta global sin filtro de tenant', async () => {
    await listarPrestamos(session('superadmin'))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as { where: { tenantId?: number } }
    expect(call.where.tenantId).toBeUndefined()
  })

  it('empresario: filtra por su tenant', async () => {
    await listarPrestamos(session('empresario', { tenantId: 4 }))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as { where: { tenantId?: number } }
    expect(call.where.tenantId).toBe(4)
  })

  it('vendedor: filtra por su vendedorId y tenant', async () => {
    await listarPrestamos(session('vendedor', { tenantId: 4 }))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as {
      where: { vendedorId?: number; tenantId?: number }
    }
    expect(call.where.vendedorId).toBe(9)
    expect(call.where.tenantId).toBe(4)
  })

  it('cliente: solo ve sus propios préstamos', async () => {
    await listarPrestamos(session('cliente', { userId: 5 }))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as { where: { clienteId?: number } }
    expect(call.where.clienteId).toBe(5)
  })

  it('rol desconocido: 403', async () => {
    const res = await listarPrestamos(session('admin'))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
    expect(prisma.prestamo.findMany).not.toHaveBeenCalled()
  })

  it('cliente no puede consultar préstamos de otro cliente', async () => {
    const res = await listarPrestamos(session('cliente', { userId: 5 }), { clienteId: 99 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
    expect(prisma.prestamo.findMany).not.toHaveBeenCalled()
  })

  it('empresario puede consultar préstamos de un cliente de su tenant', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue({ vendedorId: 1 } as never)
    const res = await listarPrestamos(session('empresario', { tenantId: 4 }), { clienteId: 10 })
    expect(res.ok).toBe(true)
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 10, tenantId: 4 }) }),
    )
  })

  it('empresario NO puede consultar un cliente de otro tenant', async () => {
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null)
    const res = await listarPrestamos(session('empresario', { tenantId: 4 }), { clienteId: 10 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(403)
  })
})
