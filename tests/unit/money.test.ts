import { describe, it, expect } from 'vitest'
import {
  roundMoney,
  esMontoValido,
  nuevoSaldo,
  nuevoMontoPagado,
  montoRestanteAlEliminar,
  SALDO_MINIMO,
} from '@/lib/money'

describe('roundMoney', () => {
  it('redondea a 2 decimales', () => {
    expect(roundMoney(133331.3332999999984)).toBe(133331.33)
    expect(roundMoney(120000.000000000004)).toBe(120000)
    expect(roundMoney(99.999)).toBe(100)
  })
})

describe('esMontoValido', () => {
  it('rechaza NaN, cero y negativos', () => {
    expect(esMontoValido(NaN)).toBe(false)
    expect(esMontoValido(0)).toBe(false)
    expect(esMontoValido(-500)).toBe(false)
    expect(esMontoValido('5000')).toBe(false)
    expect(esMontoValido(5000)).toBe(true)
  })
})

describe('nuevoSaldo', () => {
  it('regresión C1: un saldo residual de centavos deja el préstamo en 0 (se marca pagado)', () => {
    const saldoConResiduo = 0.3332999999984
    expect(nuevoSaldo(saldoConResiduo, 0.33)).toBeLessThanOrEqual(SALDO_MINIMO)
    expect(nuevoSaldo(saldoConResiduo, 0.33)).toBe(0)
  })

  it('un saldo normal se descuenta correctamente', () => {
    expect(nuevoSaldo(100000, 40000)).toBe(60000)
    expect(nuevoSaldo(100000, 100000)).toBe(0)
  })

  it('no permite saldo negativo (sin sobrepago)', () => {
    expect(nuevoSaldo(5000, 6000)).toBe(0)
  })
})

describe('nuevoMontoPagado', () => {
  it('nunca supera el monto total del préstamo', () => {
    expect(nuevoMontoPagado(95000, 10000, 100000)).toBe(100000)
    expect(nuevoMontoPagado(40000, 60000, 100000)).toBe(100000)
  })
})

describe('montoRestanteAlEliminar', () => {
  it('no baja de 0 al eliminar un pago', () => {
    expect(montoRestanteAlEliminar(10000, 10000)).toBe(0)
    expect(montoRestanteAlEliminar(5000, 10000)).toBe(0)
    expect(montoRestanteAlEliminar(30000, 10000)).toBe(20000)
  })
})
