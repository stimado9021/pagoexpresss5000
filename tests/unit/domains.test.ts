import { describe, it, expect } from 'vitest'
import {
  normalizeSubdomainSlug,
  isReservedSubdomain,
  hostnameFromHostHeader,
  getTenantSlugFromHostname,
  buildTenantUrl,
  getSessionCookieDomain,
} from '@/lib/domains'

describe('domains (multi-tenant por subdominio)', () => {
  it('normaliza slugs igual que el registro', () => {
    expect(normalizeSubdomainSlug('  Créditos Del Valle!  ')).toBe('creditos-del-valle')
    expect(normalizeSubdomainSlug('ab')).toBe('ab')
    expect(normalizeSubdomainSlug('a'.repeat(80)).length).toBe(60)
  })

  it('detecta subdominios reservados', () => {
    for (const s of ['admin', 'api', 'www', 'app', 'login', 'superadmin', 'platform']) {
      expect(isReservedSubdomain(s)).toBe(true)
    }
    expect(isReservedSubdomain('creditosdelvalle')).toBe(false)
  })

  it('limpia el header Host (puertos, listas, mayúsculas)', () => {
    expect(hostnameFromHostHeader('CreditosDelValle.Ejemplo.COM:3000')).toBe('creditosdelvalle.ejemplo.com')
    expect(hostnameFromHostHeader('a.example.com, b.example.com')).toBe('a.example.com')
    expect(hostnameFromHostHeader(null)).toBe('')
  })

  it('extrae el slug del tenant bajo la raíz configurada', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kreditools.example.com'
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    expect(getTenantSlugFromHostname('creditosdelvalle.kreditools.example.com')).toBe('creditosdelvalle')
    expect(getTenantSlugFromHostname('kreditools.example.com')).toBeNull()
    expect(getTenantSlugFromHostname('www.kreditools.example.com')).toBeNull()
    expect(getTenantSlugFromHostname('otro-dominio.com')).toBeNull()
    expect(getTenantSlugFromHostname('a.b.kreditools.example.com')).toBeNull()
    expect(getTenantSlugFromHostname('192.168.1.10')).toBeNull()
  })

  it('soporta empresa.localhost en desarrollo', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    expect(getTenantSlugFromHostname('creditosdelvalle.localhost')).toBe('creditosdelvalle')
    expect(getTenantSlugFromHostname('localhost')).toBeNull()
  })

  it('construye URLs del tenant', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kreditools.example.com'
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    expect(buildTenantUrl('creditosdelvalle')).toBe('https://creditosdelvalle.kreditools.example.com')
  })

  it('calcula el dominio de cookie compartida', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kreditools.example.com'
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN
    delete process.env.SESSION_COOKIE_DOMAIN
    expect(getSessionCookieDomain()).toBe('.kreditools.example.com')

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(getSessionCookieDomain()).toBeUndefined()

    process.env.SESSION_COOKIE_DOMAIN = '.lvh.me'
    expect(getSessionCookieDomain()).toBe('.lvh.me')
    delete process.env.SESSION_COOKIE_DOMAIN
  })
})
