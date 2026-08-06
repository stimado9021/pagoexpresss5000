export const SALDO_MINIMO = 1

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function esMontoValido(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

export function nuevoSaldo(saldoPendiente: number, monto: number): number {
  const bruto = roundMoney(saldoPendiente - monto)
  if (bruto <= SALDO_MINIMO) return 0
  return bruto
}

export function nuevoMontoPagado(montoPagado: number, monto: number, montoTotal: number): number {
  return Math.min(roundMoney(montoPagado + monto), montoTotal)
}

export function montoRestanteAlEliminar(montoPagado: number, montoEliminado: number): number {
  return Math.max(0, roundMoney(montoPagado - montoEliminado))
}
