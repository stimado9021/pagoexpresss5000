const DEFAULT_ROOT_DOMAIN = 'kreditools.shop'

/** Dominio raíz autoritativo (ej. `kreditools.shop`). */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || DEFAULT_ROOT_DOMAIN)
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')
  .toLowerCase()

function normalizeOrigin(raw: string): URL | null {
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url
  } catch {
    return null
  }
}

function hostBelongsToRoot(hostname: string): boolean {
  return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)
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
  const url = raw ? normalizeOrigin(raw) : null
  if (!url) return `https://${DEFAULT_ROOT_DOMAIN}`
  if (hostBelongsToRoot(url.hostname.toLowerCase())) return url.origin
  return `https://${DEFAULT_ROOT_DOMAIN}`
}

export const SITE_URL = getSiteUrl()