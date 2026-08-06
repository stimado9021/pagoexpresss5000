import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    prestamo: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    pago: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    historial: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/evolution-api', () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(true),
  formatReceipt: (d: { monto: number }) => `RECIBO ${d.monto}`,
}))

import { registrarPago, listarPagos } from '@/lib/services/pago-service'
import { prisma } from '@/lib/prisma'

function prestamoMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    tenantId: 2,
    clienteId: 10,
    montoTotal: '1000',
    montoPagado: '0',
    saldoPendiente: '1000',
    cuotaDiaria: '100',
    diasAtrasados: 0,
    estado: 'activo',
    fechaInicio: new Date(),
    fechaUltimoPago: null,
    cliente: { nombre: 'Ana', apellido: 'Gómez', telefono: null },
    ...overrides,
  }
}

describe('registrarPago', () => {
  beforeEach(() => {
    vi.mocked(prisma.$transaction).mockReset()
    vi.mocked(prisma.pago.create).mockReset()
    vi.mocked(prisma.pago.create).mockResolvedValue({ id: 50 } as never)
    vi.mocked(prisma.prestamo.update).mockReset()
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: 50 }] as never)
  })

  it('regresión: un saldo residual < 1 queda en 0 y el préstamo pasa a pagado', async () => {
    vi.mocked(prisma.prestamo.findFirst).mockResolvedValue(
      prestamoMock({ saldoPendiente: '1', montoPagado: '999', montoTotal: '1000' }) as never,
    )
    const res = await registrarPago({ prestamoId: 1, monto: 1, vendedorId: 3, tenantId: 2 })
    expect(res.ok).toBe(true)
    const update = vi.mocked(prisma.prestamo.update).mock.calls[0][0] as {
      data: { saldoPendiente: number; montoPagado: number; estado: string }
    }
    expect(update.data.saldoPendiente).toBe(0)
    expect(update.data.estado).toBe('pagado')
  })

  it('el préstamo se busca escopado por tenant (sin IDOR cross-tenant)', async () => {
    vi.mocked(prisma.prestamo.findFirst).mockResolvedValue(prestamoMock() as never)
    await registrarPago({ prestamoId: 1, monto: 500, vendedorId: 3, tenantId: 2 })
    expect(prisma.prestamo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 1, tenantId: 2 }) }),
    )
  })

  it('monto inválido: 400 y no escribe en BD', async () => {
    vi.mocked(prisma.prestamo.findFirst).mockResolvedValue(prestamoMock() as never)
    const res = await registrarPago({ prestamoId: 1, monto: -5, vendedorId: 3, tenantId: 2 })
    expect(res.ok).toBe(false)
    expect(prisma.pago.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('préstamo inexistente: 404', async () => {
    vi.mocked(prisma.prestamo.findFirst).mockResolvedValue(null)
    const res = await registrarPago({ prestamoId: 999, monto: 500, vendedorId: 3, tenantId: 2 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.status).toBe(404)
  })
})

describe('listarPagos', () => {
  beforeEach(() => {
    vi.mocked(prisma.prestamo.findMany).mockReset()
    vi.mocked(prisma.pago.findMany).mockReset()
    vi.mocked(prisma.pago.findMany).mockResolvedValue([] as never)
  })

  it('empresario: filtra pagos por su tenant', async () => {
    await listarPagos({ rol: 'empresario', userId: 9, tenantId: 4, limit: 50 })
    const call = vi.mocked(prisma.pago.findMany).mock.calls[0][0] as { where: { tenantId?: number } }
    expect(call.where.tenantId).toBe(4)
  })

  it('vendedor: filtra por su vendedorId', async () => {
    await listarPagos({ rol: 'vendedor', userId: 9, tenantId: 4, limit: 50 })
    const call = vi.mocked(prisma.pago.findMany).mock.calls[0][0] as { where: { vendedorId?: number } }
    expect(call.where.vendedorId).toBe(9)
  })

  it('cliente: solo ve pagos de sus préstamos', async () => {
    vi.mocked(prisma.prestamo.findMany).mockResolvedValue([{ id: 1 }, { id: 2 }] as never)
    await listarPagos({ rol: 'cliente', userId: 5, limit: 50 })
    const call = vi.mocked(prisma.pago.findMany).mock.calls[0][0] as { where: { prestamoId: { in: number[] } } }
    expect(call.where.prestamoId).toEqual({ in: [1, 2] })
  })
})
