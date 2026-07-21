export function calcularDiasAtrasados(prestamo: {
  estado: string
  fechaUltimoPago: Date | string | null
  fechaInicio: Date | string
}): number {
  if (prestamo.estado !== 'activo') return 0
  const refDate = prestamo.fechaUltimoPago
    ? new Date(prestamo.fechaUltimoPago)
    : new Date(prestamo.fechaInicio)
  const now = new Date()
  const diff = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff - 1)
}
