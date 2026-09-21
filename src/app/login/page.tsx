import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getTenantSlugFromHost } from '@/lib/domains'
import LoginForm from './LoginForm'

export type TenantBranding = {
  slug: string
  nombre: string
  logoUrl: string | null
} | null

async function getBranding(): Promise<TenantBranding> {
  try {
    const h = await headers()
    const slug = getTenantSlugFromHost(h.get('x-forwarded-host') ?? h.get('host'))
    if (!slug) return null
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        slug: true,
        nombre: true,
        status: true,
        configuracion: { select: { nombreEmpresa: true, logoUrl: true } },
      },
    })
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') return null
    return {
      slug: tenant.slug,
      nombre: tenant.configuracion?.nombreEmpresa || tenant.nombre,
      logoUrl: tenant.configuracion?.logoUrl ?? null,
    }
  } catch {
    return null
  }
}

export default async function LoginPage() {
  const session = await getSession()
  if (session?.rol) {
    const routes: Record<string, string> = {
      superadmin: '/admin',
      empresario: '/empresario',
      vendedor: '/vendedor',
      cliente: '/cliente',
    }
    const destino = routes[session.rol]
    if (destino) redirect(destino)
  }

  const branding = await getBranding()

  return <LoginForm branding={branding} />
}
