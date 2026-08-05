import { describe, it, expect } from 'vitest'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

describe('rateLimit', () => {
  it('permite las primeras N peticiones dentro de la ventana', () => {
    expect(rateLimit('t-key-1', 3, 60_000)).toBe(true)
    expect(rateLimit('t-key-1', 3, 60_000)).toBe(true)
    expect(rateLimit('t-key-1', 3, 60_000)).toBe(true)
    expect(rateLimit('t-key-1', 3, 60_000)).toBe(false)
  })

  it('reinicia el contador al vencer la ventana de tiempo', async () => {
    expect(rateLimit('t-key-2', 2, 50)).toBe(true)
    expect(rateLimit('t-key-2', 2, 50)).toBe(true)
    expect(rateLimit('t-key-2', 2, 50)).toBe(false)
    await new Promise((r) => setTimeout(r, 80))
    expect(rateLimit('t-key-2', 2, 50)).toBe(true)
  })

  it('mantiene buckets independientes por clave', () => {
    expect(rateLimit('t-a', 1, 60_000)).toBe(true)
    expect(rateLimit('t-b', 1, 60_000)).toBe(true)
    expect(rateLimit('t-a', 1, 60_000)).toBe(false)
    expect(rateLimit('t-b', 1, 60_000)).toBe(false)
  })
})

describe('getClientIp', () => {
  it('extrae la primera IP de x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    })
    expect(getClientIp(req)).toBe('203.0.113.5')
  })

  it('usa x-real-ip como respaldo', () => {
    const req = new Request('http://localhost', { headers: { 'x-real-ip': '198.51.100.9' } })
    expect(getClientIp(req)).toBe('198.51.100.9')
  })

  it('devuelve "unknown" si no hay cabeceras', () => {
    expect(getClientIp(new Request('http://localhost'))).toBe('unknown')
  })
})
