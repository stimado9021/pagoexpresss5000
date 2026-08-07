export const NEGOCIO_TIMEZONE: string = process.env.NEXT_PUBLIC_NEGOCIO_TIMEZONE ?? 'America/Bogota'

export function claveEnZona(d: Date | string, tz: string = NEGOCIO_TIMEZONE): string {
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
  const fecha = typeof d === 'string' ? new Date(d) : new Date(d)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha)
  const get = (tipo: 'year' | 'month' | 'day'): string => parts.find((p) => p.type === tipo)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function hoyClaveEnZona(tz: string = NEGOCIO_TIMEZONE): string {
  return claveEnZona(new Date(), tz)
}

export function fechaHoyNegocio(tz: string = NEGOCIO_TIMEZONE): Date {
  return new Date(`${hoyClaveEnZona(tz)}T00:00:00`)
}
