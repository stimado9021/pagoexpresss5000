// ─────────────────────────────────────────────────────────────
// Dominios multi-tenant (PURO: sin prisma, sin server-only).
// Seguro para importar desde `proxy.ts` (runtime Node) y desde
// Server Components / Route Handlers.
// ─────────────────────────────────────────────────────────────

export const RESERVED_SUBDOMAINS = [
  'platform',
  'admin',
  'superadmin',
  'api',
  'login',
  'registro',
  'register',
  'signup',
  'www',
  'app',
  'mail',
  'email',
  'soporte',
  'ayuda',
  'help',
  'demo',
  'test',
  'staging',
  'dev',
  'blog',
  'docs',
  'status',
  'billing',
  'facturacion',
  'planes',
  'pricing',
  'cdn',
  'static',
  'assets',
  'auth',
  'contacto',
  'terminos',
  'privacidad',
  'root',
  'owner',
] as const

export function isReservedSubdomain(slug: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(slug.toLowerCase())
}

/** Normaliza un nombre a slug de subdominio (máx 60 chars). */
export function normalizeSubdomainSlug(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/** Host raíz configurado (con puerto si es no estándar, ej. `localhost:3000`). */
export function getRootDomain(): string {
  const explicit = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
  if (explicit) return explicit.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
}

function getAppProtocol(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return appUrl.startsWith('http://') ? 'http' : 'https'
}

/** Extrae el hostname limpio de un header Host/X-Forwarded-Host (toma el primero). */
export function hostnameFromHostHeader(hostHeader: string | null | undefined): string {
  if (!hostHeader) return ''
  const first = hostHeader.split(',')[0].trim().toLowerCase()
  if (first.startsWith('[')) {
    const end = first.indexOf(']')
    return end >= 0 ? first.slice(0, end + 1) : first
  }
  const colon = first.lastIndexOf(':')
  if (colon >= 0 && first.indexOf(':') === colon) {
    return first.slice(0, colon)
  }
  return first
}

function stripPort(host: string): string {
  if (host.startsWith('[')) return host
  const colon = host.lastIndexOf(':')
  if (colon >= 0 && host.indexOf(':') === colon) return host.slice(0, colon)
  return host
}

function isIpHostname(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.startsWith('[') || hostname.includes(':')
}

/**
 * Devuelve el slug del tenant para un hostname dado, o null si es el
 * dominio raíz (apex), www, IP/localhost sin subdominio.
 * No valida reservados: usa `isReservedSubdomain` para eso.
 */
export function getTenantSlugFromHostname(hostname: string): string | null {
  const host = stripPort(hostname.trim().toLowerCase())
  if (!host || isIpHostname(host)) return null
  const root = stripPort(getRootDomain())
  if (!root || isIpHostname(root)) {
    // Raíz no es un dominio con subdominios (ej. localhost o IP):
    // `empresa.localhost` sí se soporta como tenant en desarrollo.
    if (host === 'localhost') return null
    if (host.endsWith('.localhost')) {
      const slug = host.slice(0, -'.localhost'.length)
      return slug && !slug.includes('.') ? slug : null
    }
    return null
  }
  if (host === root || host === `www.${root}`) return null
  if (!host.endsWith(`.${root}`)) return null
  const slug = host.slice(0, -(root.length + 1))
  if (!slug || slug.includes('.') || !/^[a-z0-9-]+$/.test(slug)) return null
  return slug
}

export function getTenantSlugFromHost(hostHeader: string | null | undefined): string | null {
  return getTenantSlugFromHostname(hostnameFromHostHeader(hostHeader))
}

/** URL absoluta del espacio de trabajo de un tenant. */
export function buildTenantUrl(slug: string): string {
  return `${getAppProtocol()}://${slug}.${getRootDomain()}`
}

/** URL de login del espacio de trabajo de un tenant. */
export function buildTenantLoginUrl(slug: string, from?: string): string {
  const url = `${buildTenantUrl(slug)}/login`
  return from ? `${url}?from=${encodeURIComponent(from)}` : url
}

/** URL para aceptar una invitación dentro del subdominio del tenant. */
export function buildTenantInviteUrl(slug: string, token: string): string {
  return `${buildTenantUrl(slug)}/aceptar-invitacion?token=${encodeURIComponent(token)}`
}

/**
 * Dominio para la cookie de sesión compartida entre subdominios
 * (ej. `.midominio.com`). undefined en localhost/IP (cookies host-only).
 * Se puede forzar con SESSION_COOKIE_DOMAIN.
 */
export function getSessionCookieDomain(): string | undefined {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim()
  if (explicit) return explicit || undefined
  const root = stripPort(getRootDomain())
  if (!root || isIpHostname(root) || root === 'localhost' || !root.includes('.')) {
    return undefined
  }
  return root.startsWith('.') ? root : `.${root}`
}
