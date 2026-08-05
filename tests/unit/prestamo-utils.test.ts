import { describe, it, expect } from 'vitest'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

describe('calcularDiasAtrasados', () => {
  it('devuelve 0 si el préstamo está pagado sin importar las fechas', () => {
    const r = calcularDiasAtrasados({
      estado: 'pagado',
      fechaUltimoPago: daysAgo(10),
      fechaInicio: daysAgo(30),
    })
    expect(r).toBe(0)
  })

  it('devuelve 0 para préstamos en moratoria (activo, sin atraso)', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaUltimoPago: daysAgo(0),
      fechaInicio: daysAgo(10),
    })
    expect(r).toBe(0)
  })

  it('cuenta 1 día de atraso al cumplirse el día siguiente al último pago', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaUltimoPago: daysAgo(2),
      fechaInicio: daysAgo(20),
    })
    expect(r).toBe(1)
  })

  it('acumula días de atraso (5 días sin pago = 4 de atraso)', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaUltimoPago: daysAgo(5),
      fechaInicio: daysAgo(20),
    })
    expect(r).toBe(4)
  })

  it('usa fechaInicio como referencia si no hay fechaUltimoPago', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaUltimoPago: null,
      fechaInicio: daysAgo(8),
    })
    expect(r).toBe(7)
  })

  it('acepta fechas como string ISO', () => {
    const iso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const r = calcularDiasAtrasados({ estado: 'activo', fechaUltimoPago: iso, fechaInicio: iso })
    expect(r).toBe(2)
  })
})
