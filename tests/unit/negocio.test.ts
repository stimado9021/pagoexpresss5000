import { describe, it, expect } from 'vitest'
import { claveEnZona, hoyClaveEnZona, fechaHoyNegocio } from '@/lib/negocio'
import { fechasCubiertas, hoyCubierto, claveFecha } from '@/lib/prestamo-utils'

describe('claveEnZona', () => {
  it('convierte un instante a su día calendario en la zona', () => {
    expect(claveEnZona(new Date('2026-08-05T05:00:00.000Z'), 'America/Bogota')).toBe('2026-08-05')
    expect(claveEnZona(new Date('2026-08-05T04:59:59.000Z'), 'America/Bogota')).toBe('2026-08-04')
  })

  it('es correcta en zonas al este (España) y al oeste (LA) de Bogotá', () => {
    expect(claveEnZona(new Date('2026-08-05T05:00:00.000Z'), 'Europe/Madrid')).toBe('2026-08-05')
    expect(claveEnZona(new Date('2026-08-05T23:30:00.000Z'), 'Europe/Madrid')).toBe('2026-08-06')
    expect(claveEnZona(new Date('2026-08-05T05:00:00.000Z'), 'America/Los_Angeles')).toBe('2026-08-04')
  })

  it('una cadena solo-fecha se devuelve tal cual', () => {
    expect(claveEnZona('2026-08-05', 'America/Bogota')).toBe('2026-08-05')
    expect(claveEnZona('2026-08-05', 'Europe/Madrid')).toBe('2026-08-05')
  })

  it('fechaHoyNegocio produce una fecha cuyos componentes locales son el día de negocio', () => {
    expect(claveFecha(fechaHoyNegocio('America/Bogota'))).toBe(hoyClaveEnZona('America/Bogota'))
  })
})

describe('cobertura con zona horaria', () => {
  it('fechasCubiertas clavea por la zona indicada (evita el corrimiento en zonas oeste)', () => {
    const pagos = [{ fechaPago: new Date('2026-08-05T05:00:00.000Z'), diasCubiertos: 1 }]
    expect(fechasCubiertas(pagos, 'America/Bogota').has('2026-08-05')).toBe(true)
    expect(fechasCubiertas(pagos, 'Europe/Madrid').has('2026-08-05')).toBe(true)
    expect(fechasCubiertas(pagos, 'America/Los_Angeles').has('2026-08-04')).toBe(true)
  })

  it('hoyCubierto con tz usa el día de la zona, no el del navegador', () => {
    const pagos = [{ fechaPago: new Date('2026-08-05T05:00:00.000Z'), diasCubiertos: 1 }]
    expect(hoyCubierto(pagos, new Date('2026-08-05T10:00:00.000Z'), 'America/Bogota')).toBe(true)
    expect(hoyCubierto(pagos, new Date('2026-08-06T10:00:00.000Z'), 'America/Bogota')).toBe(false)
    expect(hoyCubierto(pagos, new Date('2026-08-05T23:30:00.000Z'), 'America/Bogota')).toBe(true)
  })
})
