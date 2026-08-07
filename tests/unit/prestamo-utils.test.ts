import { describe, it, expect } from 'vitest'
import { calcularDiasAtrasados, hoyCubierto, claveFecha } from '@/lib/prestamo-utils'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function dia(n: number): string {
  return claveFecha(daysAgo(n))
}

function pago(offset: number, diasCubiertos = 1) {
  return { fechaPago: daysAgo(offset), diasCubiertos }
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

  it('cubre días pasados: con pagos al día el atraso es 0', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaInicio: daysAgo(4),
      pagos: [pago(3), pago(2), pago(1)],
    })
    expect(r).toBe(0)
  })

  it('atraso por cobertura: 1 día vencido sin cubrir = 1', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaInicio: daysAgo(4),
      pagos: [pago(3), pago(2)],
    })
    expect(r).toBe(1)
  })

  it('pagar HOY no borra el atraso de ayer (viceversa)', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaInicio: daysAgo(4),
      pagos: [pago(3), pago(2), pago(0)],
    })
    expect(r).toBe(1)
  })

  it('dos pagos en el mismo día cubren un solo día', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaInicio: daysAgo(4),
      pagos: [pago(2), pago(2)],
    })
    expect(r).toBe(2)
  })

  it('un pago con diasCubiertos=2 cubre dos días consecutivos', () => {
    const r = calcularDiasAtrasados({
      estado: 'activo',
      fechaInicio: daysAgo(5),
      pagos: [pago(4, 2)],
    })
    expect(r).toBe(2)
  })

  it('hoyCubierto: true si un pago cubre el día actual', () => {
    expect(hoyCubierto([pago(0)])).toBe(true)
    expect(hoyCubierto([pago(1)])).toBe(false)
    expect(hoyCubierto([{ fechaPago: dia(1), diasCubiertos: 2 }])).toBe(true)
  })
})
