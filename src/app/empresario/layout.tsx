import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isBlockedStatus, isAllowedWhenBlocked } from '@/lib/subscription-guard'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  // Solo empresario necesita gate; superadmin/vendedor/cliente no pasan por este layout
  if (session?.tenantId && session.rol === 'empresario') {
    const h = await headers()
    const pathname = h.get('x-pathname') || ''
    // No bloquear si ya está en ruta permitida (billing, apis)
    if (!isAllowedWhenBlocked(pathname)) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { status: true, trialEndsAt: true },
      })
      if (tenant && isBlockedStatus(tenant.status)) {
        redirect('/empresario/billing?blocked=1')
      }
      // También bloquear si TRIAL vencido pero aún no migrado por cron
      if (tenant?.status === 'TRIAL' && tenant.trialEndsAt < new Date()) {
        redirect('/empresario/billing?blocked=1')
      }
    }
  }
  return <>{children}</>
}