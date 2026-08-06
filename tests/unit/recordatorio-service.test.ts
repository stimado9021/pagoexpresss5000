import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { prestamo: { findMany: vi.fn() } },
}))

vi.mock('@/lib/evolution-api', () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(true),
  formatRecordatorio: () => 'RECORDATORIO',
}))

vi.mock('@/lib/prestamo-utils', () => ({
  calcularDiasAtrasados: () => 0,
}))

import { enviarRecordatorios } from '@/lib/services/recordatorio-service'
import { prisma } from '@/lib/prisma'

function session(rol: string, extra: Record<string, unknown> = {}) {
  return { rol, userId: 9, tenantId: undefined, ...extra } as never
}

describe('enviarRecordatorios (alcance por rol / OCP)', () => {
  beforeEach(() => {
    vi.mocked(prisma.prestamo.findMany).mockReset()
    vi.mocked(prisma.prestamo.findMany).mockResolvedValue([] as never)
  })

  it('superadmin: todos los préstamos activos sin tenant', async () => {
    await enviarRecordatorios(session('superadmin'))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as {
      where: { estado?: string; tenantId?: number; vendedorId?: number }
    }
    expect(call.where.estado).toBe('activo')
    expect(call.where.tenantId).toBeUndefined()
  })

  it('empresario: préstamos activos de su tenant', async () => {
    await enviarRecordatorios(session('empresario', { tenantId: 4 }))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as {
      where: { tenantId?: number }
    }
    expect(call.where.tenantId).toBe(4)
  })

  it('vendedor: solo préstamos de su cartera', async () => {
    await enviarRecordatorios(session('vendedor'))
    const call = vi.mocked(prisma.prestamo.findMany).mock.calls[0][0] as {
      where: { vendedorId?: number }
    }
    expect(call.where.vendedorId).toBe(9)
  })
})
