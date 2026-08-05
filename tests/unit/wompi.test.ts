import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHash } from 'crypto'
import { buildReference, parseReference, verifyEventSignature } from '@/lib/wompi'

const original = { ...process.env }

afterEach(() => {
  process.env = { ...original }
})

describe('buildReference / parseReference', () => {
  it('construye una referencia válida y la parsea de vuelta', () => {
    const ref = buildReference(42, 7, 'ANUAL')
    expect(ref).toMatch(/^PE-42-7-ANUAL-\d+$/)
    expect(parseReference(ref)).toEqual({ tenantId: 42, planId: 7, intervalo: 'ANUAL' })
  })

  it('parsea referencias mensuales', () => {
    expect(parseReference('PE-3-2-MONTHLY-1700000000000')).toEqual({ tenantId: 3, planId: 2, intervalo: 'MONTHLY' })
  })

  it('devuelve null para referencias inválidas', () => {
    expect(parseReference('')).toBeNull()
    expect(parseReference('PAGO-3-2-MONTHLY')).toBeNull()
    expect(parseReference('PE-a-b-MONTHLY-123')).toBeNull()
    expect(parseReference('PE-3-2-ANUAL')).toBeNull()
  })
})

describe('verifyEventSignature', () => {
  const eventsKey = 'test_events_secret_value'
  const data = {
    transaction: {
      id: '04a6e53d-a244-4140-ab9e-48fa541f9fe5',
      status: 'APPROVED',
      amount_in_cents: 7500000,
    },
  }
  const timestamp = 1747673128600
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']

  beforeEach(() => {
    process.env.WOMPI_EVENTS_KEY = eventsKey
  })

  it('valida un evento firmado correctamente', () => {
    const raw = [data.transaction.id, data.transaction.status, data.transaction.amount_in_cents]
      .join('') + String(timestamp) + eventsKey
    const checksum = createHash('sha256').update(raw).digest('hex')

    const ok = verifyEventSignature({
      data,
      timestamp,
      signature: { properties, checksum },
    })
    expect(ok).toBe(true)
  })

  it('rechaza un evento con checksum alterado', () => {
    const ok = verifyEventSignature({
      data: { ...data, transaction: { ...data.transaction, status: 'DECLINED' } },
      timestamp,
      signature: { properties, checksum: '0'.repeat(64) },
    })
    expect(ok).toBe(false)
  })

  it('rechaza eventos sin firma cuando hay events key configurada', () => {
    const ok = verifyEventSignature({ data, timestamp })
    expect(ok).toBe(false)
  })

  it('acepta eventos sin validar si no hay events key configurada (modo desarrollo)', () => {
    delete process.env.WOMPI_EVENTS_KEY
    const ok = verifyEventSignature({ data, timestamp })
    expect(ok).toBe(true)
  })
})
