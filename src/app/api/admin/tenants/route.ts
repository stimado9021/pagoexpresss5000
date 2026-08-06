import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: 'platform' } },
    include: {
      plan: { select: { nombre: true, precioMensual: true } },
      _count: { select: { usuarios: true, prestamos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const data = tenants.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    slug: t.slug,
    subdominio: t.subdominio,
    status: t.status,
    planName: t.plan?.nombre ?? 'Sin plan',
    planPrice: t.plan?.precioMensual ?? 0,
    totalUsuarios: t._count.usuarios,
    totalPrestamos: t._count.prestamos,
    trialStartsAt: t.trialStartsAt,
    trialEndsAt: t.trialEndsAt,
    createdAt: t.createdAt,
  }))

  return NextResponse.json({ success: true, data })
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { id, status, planId, trialDays } = body

  if (!id) {
    return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}

  if (status) {
    updateData.status = status
    if (status === 'TRIAL' && !updateData.trialStartsAt) {
      updateData.trialStartsAt = new Date()
      updateData.trialEndsAt = new Date(Date.now() + (trialDays || 14) * 24 * 60 * 60 * 1000)
    }
    if (status === 'ACTIVE') {
      updateData.planStartsAt = new Date()
    }
  }

  if (planId) {
    updateData.planId = planId
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data: updateData,
    include: { plan: { select: { nombre: true } } },
  })

  return NextResponse.json({ success: true, data: tenant })
}