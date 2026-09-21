import 'server-only'
import { headers } from 'next/headers'
import { prisma } from './prisma'
import { getTenantSlugFromHost } from './domains'

/**
 * Resolución de tenant desde el Host (DB). Acepta:
 *  1. slug bajo la raíz actual (`slug.midominio.com`),
 *  2. `customDomain` exacto (dominios propios de clientes),
 *  3. `subdominio` exacto (hostname completo legacy).
 */
export async function resolveTenantByHost(hostHeader: string | null | undefined) {
  const slug = getTenantSlugFromHost(hostHeader)
  const { hostnameFromHostHeader } = await import('./domains')
  const hostname = hostnameFromHostHeader(hostHeader)

  if (slug) {
    const bySlug = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, subdominio: true, nombre: true, status: true, planId: true },
    })
    if (bySlug) return bySlug
  }

  if (hostname) {
    const byCustom = await prisma.tenant.findFirst({
      where: { customDomain: hostname },
      select: { id: true, slug: true, subdominio: true, nombre: true, status: true, planId: true },
    })
    if (byCustom) return byCustom
    const byLegacy = await prisma.tenant.findFirst({
      where: { subdominio: hostname },
      select: { id: true, slug: true, subdominio: true, nombre: true, status: true, planId: true },
    })
    if (byLegacy) return byLegacy
  }

  return null
}

/** Slug del tenant que puso el proxy (`x-tenant-slug`) o derivado del Host. */
export async function getRequestTenantSlug(): Promise<string | null> {
  try {
    const h = await headers()
    const fromProxy = h.get('x-tenant-slug')
    if (fromProxy) return fromProxy
    return getTenantSlugFromHost(h.get('x-forwarded-host') ?? h.get('host'))
  } catch {
    return null
  }
}

export type HostAccess =
  | { ok: true }
  | { ok: false; expectedSlug?: string; message: string }

/**
 * Verificación SEGURA (con DB) de que la sesión puede operar en el
 * subdominio actual. Usada por requireSession/requireRole y rutas sensibles.
 * - superadmin (plataforma): siempre ok.
 * - Sin subdominio (apex): ok (el login contextual ya eligió el tenant).
 * - Con subdominio: session.tenantSlug (o slug del tenant en DB) debe coincidir.
 * Falla en abierto solo si no hay contexto de request (tests/cron).
 */
export async function checkTenantHostAccess(session: {
  rol: string
  tenantId?: number | null
  tenantSlug?: string | null
}): Promise<HostAccess> {
  if (session.rol === 'superadmin') return { ok: true }
  let slug: string | null
  try {
    slug = await getRequestTenantSlug()
  } catch {
    return { ok: true }
  }
  if (!slug) return { ok: true }

  if (session.tenantSlug) {
    return session.tenantSlug === slug
      ? { ok: true }
      : {
          ok: false,
          expectedSlug: session.tenantSlug,
          message: 'No perteneces a este espacio de trabajo',
        }
  }

  if (!session.tenantId) {
    return { ok: false, message: 'Sesión sin espacio de trabajo. Vuelve a ingresar.' }
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { slug: true },
    })
    if (!tenant) return { ok: false, message: 'Espacio de trabajo no encontrado' }
    return tenant.slug === slug
      ? { ok: true }
      : { ok: false, expectedSlug: tenant.slug, message: 'No perteneces a este espacio de trabajo' }
  } catch {
    return { ok: true }
  }
}
