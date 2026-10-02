const DEFAULT_ROOT_DOMAIN = 'kreditools.shop'

/** Dominio raíz autoritativo (ej. `kreditools.shop`). */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || DEFAULT_ROOT_DOMAIN)
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .toLowerCase()

function normalizeOrigin(raw: string): { origin: string; hostname: string } | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return { origin: url.origin, hostname: url.hostname.toLowerCase() }
  } catch {
    return null
  }
}

/**
 * Origen público del sitio para SEO (canonical, sitemap, robots, OpenGraph).
 *
 * Ignora cualquier valor de entorno cuyo host no pertenezca a `ROOT_DOMAIN`,
 * para que un valor obsoleto en produccion no vuelva a inyectar un dominio
 * ajeno en las etiquetas de indexacion.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
  const parsed = raw ? normalizeOrigin(raw) : null
  if (!parsed) return `https://${DEFAULT_ROOT_DOMAIN}`
  const { origin, hostname } = parsed
  if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) return origin
  return `https://${DEFAULT_ROOT_DOMAIN}`
}

export const SITE_URL = getSiteUrl()