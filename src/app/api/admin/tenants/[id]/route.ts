import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  const id = Number((await params).id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, message: 'ID inválido' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: { select: { nombre: true, precioMensual: true, precioAnual: true } },
      configuracion: true,
      suscripciones: true,
      usuarios: {
        select: {
          id: true,
          cedula: true,
          nombre: true,
          apellido: true,
          email: true,
          rol: true,
          activo: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { usuarios: true, prestamos: true, pagos: true, invitaciones: true },
      },
    },
  })

  if (!tenant) {
    return NextResponse.json({ success: false, message: 'Empresa no encontrada' }, { status: 404 })
  }

  const prestamos = await prisma.prestamo.aggregate({
    where: { tenantId: tenant.id },
    _sum: { montoTotal: true, montoSolicitado: true },
    _count: true,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: tenant.id,
      nombre: tenant.nombre,
      slug: tenant.slug,
      subdominio: tenant.subdominio,
      logoUrl: tenant.logoUrl,
      status: tenant.status,
      plan: tenant.plan
        ? {
            nombre: tenant.plan.nombre,
            precioMensual: Number(tenant.plan.precioMensual),
            precioAnual: tenant.plan.precioAnual ? Number(tenant.plan.precioAnual) : null,
          }
        : null,
      configuracion: tenant.configuracion
        ? {
            nombreEmpresa: tenant.configuracion.nombreEmpresa,
            tasaInteres: Number(tenant.configuracion.tasaInteres),
            cuotaDiariaMin: Number(tenant.configuracion.cuotaDiariaMin),
          }
        : null,
      suscripciones: tenant.suscripciones.map((s) => ({
        id: s.id,
        estado: s.estado,
        intervalo: s.intervalo,
        cicloActual: s.cicloActual,
        renovacionProxima: s.renovacionProxima,
        pagadoHasta: s.pagadoHasta,
      })),
      trialStartsAt: tenant.trialStartsAt,
      trialEndsAt: tenant.trialEndsAt,
      planStartsAt: tenant.planStartsAt,
      planExpiresAt: tenant.planExpiresAt,
      createdAt: tenant.createdAt,
      totalUsuarios: tenant._count.usuarios,
      totalPrestamos: tenant._count.prestamos,
      totalPagos: tenant._count.pagos,
      totalInvitaciones: tenant._count.invitaciones,
      montoColocado: Number(prestamos._sum.montoSolicitado ?? 0),
      montoTotalCartera: Number(prestamos._sum.montoTotal ?? 0),
      usuarios: tenant.usuarios,
    },
  })
}