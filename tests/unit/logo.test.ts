import { describe, it, expect } from 'vitest'
import { isValidLogoDataUrl, toLogoDataUrl, isValidLogoType, MAX_LOGO_BYTES } from '@/lib/logo'

describe('logo helper', () => {
  it('acepta tipos permitidos y rechaza otros', () => {
    expect(isValidLogoType('image/png')).toBe(true)
    expect(isValidLogoType('image/jpeg')).toBe(true)
    expect(isValidLogoType('image/webp')).toBe(true)
    expect(isValidLogoType('image/svg+xml')).toBe(false)
    expect(isValidLogoType('text/html')).toBe(false)
  })

  it('genera un data URL válido y rechaza tipos inválidos', () => {
    const buf = Buffer.from('fake-image')
    expect(toLogoDataUrl('image/png', buf)).toBe(`data:image/png;base64,${buf.toString('base64')}`)
    expect(toLogoDataUrl('image/svg+xml', buf)).toBeNull()
  })

  it('valida data URLs correctos y de tamaño dentro del límite', () => {
    const buf = Buffer.alloc(1024, 1)
    const dataUrl = toLogoDataUrl('image/png', buf)
    expect(isValidLogoDataUrl(dataUrl)).toBe(true)
  })

  it('rechaza data URLs de otro formato o tamaño excesivo', () => {
    expect(isValidLogoDataUrl('data:image/svg+xml;base64,AAAA')).toBe(false)
    expect(isValidLogoDataUrl('data:image/png;base64,AAAA')).toBe(true)
    expect(isValidLogoDataUrl(null)).toBe(false)
    expect(isValidLogoDataUrl(undefined)).toBe(false)
    const huge = `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_LOGO_BYTES * 4) / 3) + 10)}`
    expect(isValidLogoDataUrl(huge)).toBe(false)
  })
})
