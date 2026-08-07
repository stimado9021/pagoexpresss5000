import { claveEnZona } from './negocio'

const DIA_MS = 86_400_000

export type PagoCobertura = { fechaPago: Date | string; diasCubiertos?: number | null }

export function claveFecha(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function iniciarDia(d: Date | string): Date {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, dd] = d.split('-').map(Number)
    return new Date(y, m - 1, dd)
  }
  const parsed = typeof d === 'string' ? new Date(d) : new Date(d)
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export function agregarDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function fechasCubiertas(pagos: PagoCobertura[] | null | undefined, tz?: string): Set<string> {
  const set = new Set<string>()
  for (const p of pagos ?? []) {
    const d0 = tz ? new Date(`${claveEnZona(p.fechaPago, tz)}T00:00:00`) : iniciarDia(p.fechaPago)
    const n = Math.max(1, Number(p.diasCubiertos) || 1)
    for (let i = 0; i < n; i++) set.add(claveFecha(agregarDias(d0, i)))
  }
  return set
}

export function atrasoDesdeCobertura(
  fechaInicio: Date | string,
  cubiertas: Set<string>,
  hoy: Date = new Date()
): number {
  const inicio = iniciarDia(fechaInicio)
  const hoyDia = iniciarDia(hoy)
  const hoyK = claveFecha(hoyDia)
  const cuotasEsperadas = Math.max(0, Math.floor((hoyDia.getTime() - inicio.getTime()) / DIA_MS) - 1)
  let cubiertasPasadas = 0
  for (const k of cubiertas) {
    if (k < hoyK) {
      const d = new Date(`${k}T00:00:00`)
      if (d.getTime() > inicio.getTime()) cubiertasPasadas++
    }
  }
  return Math.max(0, cuotasEsperadas - cubiertasPasadas)
}

export function diasAtrasadosDesdeCobertura(prestamo: {
  estado: string
  fechaInicio: Date | string
  pagos?: PagoCobertura[] | null
}): number | null {
  if (prestamo.estado !== 'activo') return 0
  const pagos = prestamo.pagos
  if (!pagos || pagos.length === 0) return null
  return atrasoDesdeCobertura(prestamo.fechaInicio, fechasCubiertas(pagos))
}

export function hoyCubierto(
  pagos: PagoCobertura[] | null | undefined,
  hoy: Date = new Date(),
  tz?: string
): boolean {
  const hoyK = tz ? claveEnZona(hoy, tz) : claveFecha(iniciarDia(hoy))
  return fechasCubiertas(pagos, tz).has(hoyK)
}

export function primeraFechaSinCubrir(
  fechaInicio: Date | string,
  cubiertas: Set<string>,
  hoy: Date = new Date()
): Date {
  const inicio = iniciarDia(fechaInicio)
  const hoyDia = iniciarDia(hoy)
  const hoyK = claveFecha(hoyDia)
  const maxDias = Math.max(1, Math.floor((hoyDia.getTime() - inicio.getTime()) / DIA_MS))
  let d = agregarDias(inicio, 1)
  for (let i = 0; i < maxDias; i++) {
    const k = claveFecha(d)
    if (k >= hoyK) break
    if (!cubiertas.has(k)) return d
    d = agregarDias(d, 1)
  }
  return hoyDia
}

export function calcularDiasAtrasados(prestamo: {
  estado: string
  fechaUltimoPago?: Date | string | null
  fechaInicio: Date | string
  pagos?: PagoCobertura[] | null
}): number {
  if (prestamo.estado !== 'activo') return 0
  const conCobertura = diasAtrasadosDesdeCobertura(prestamo)
  if (conCobertura !== null) return conCobertura
  const refDate = prestamo.fechaUltimoPago
    ? iniciarDia(prestamo.fechaUltimoPago)
    : iniciarDia(prestamo.fechaInicio)
  const diff = Math.floor((iniciarDia(new Date()).getTime() - refDate.getTime()) / DIA_MS)
  return Math.max(0, diff - 1)
}
