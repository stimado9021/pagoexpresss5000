import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const totalTenants = await prisma.tenant.count({ where: { slug: { not: 'platform' } } })
  const trialTenants = await prisma.tenant.count({ where: { status: 'TRIAL', slug: { not: 'platform' } } })
  const activeTenants = await prisma.tenant.count({ where: { status: 'ACTIVE', slug: { not: 'platform' } } })
  const expiredTenants = await prisma.tenant.count({ where: { status: 'TRIAL_EXPIRED', slug: { not: 'platform' } } })
  const suspendedTenants = await prisma.tenant.count({ where: { status: 'SUSPENDED', slug: { not: 'platform' } } })
  const totalUsuarios = await prisma.usuario.count({ where: { tenantId: { not: null } } })
  const totalPrestamos = await prisma.prestamo.count()
  const totalPagos = await prisma.pago.count()
  const tenant30d = await prisma.tenant.count({
    where: {
      slug: { not: 'platform' },
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  const planDistribution = await prisma.tenant.groupBy({
    by: ['planId'],
    where: { slug: { not: 'platform' } },
    _count: { id: true },
  })

  return NextResponse.json({
    success: true,
    data: {
      totalTenants,
      trialTenants,
      activeTenants,
      expiredTenants,
      suspendedTenants,
      totalUsuarios,
      totalPrestamos,
      totalPagos,
      tenant30d,
      planDistribution,
      monthlyMRR: activeTenants * 99,
      conversionRate: totalTenants > 0 ? ((activeTenants / totalTenants) * 100).toFixed(1) : '0',
    },
  })
}