import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { isBlockedStatus } from '@/lib/subscription-guard'

// Gate para roles operativos: si la empresa está bloqueada (o el trial
// venció aunque el cron aún no migre el estado), fuera a /suspendido.
// Cubre sesiones que ya estaban abiertas antes del bloqueo.
export default async function RolGate({ children, rol }: { children: React.ReactNode; rol: string }) {
  const session = await getSession()
  if (session?.tenantId && session.rol === rol) {
    const h = await headers()
    const pathname = h.get('x-pathname') || ''
    const enRutaPublica =
      pathname === '/suspendido' || pathname === '/login' || pathname.startsWith('/api/auth')
    if (!enRutaPublica) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { status: true, trialEndsAt: true },
      })
      const vencido = tenant?.status === 'TRIAL' && tenant.trialEndsAt < new Date()
      if (tenant && (isBlockedStatus(tenant.status) || vencido)) {
        redirect('/suspendido')
      }
    }
  }
  return <>{children}</>
}
