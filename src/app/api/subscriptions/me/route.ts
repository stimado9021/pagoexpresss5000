import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const [tenant, suscripcion, planes, vendedores, clientes, prestamosActivos] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: session.tenantId }, include: { plan: true } }),
      prisma.suscripcion.findUnique({
        where: { tenantId: session.tenantId },
        include: { plan: { include: { limietes: true } } },
      }),
      prisma.plan.findMany({ where: { activo: true }, orderBy: { precioMensual: 'asc' } }),
      prisma.usuario.count({ where: { tenantId: session.tenantId, rol: { in: ['vendedor', 'empresario'] } } }),
      prisma.usuario.count({ where: { tenantId: session.tenantId, rol: 'cliente' } }),
      prisma.prestamo.count({ where: { tenantId: session.tenantId, estado: 'activo' } }),
    ])

    if (!tenant) {
      return NextResponse.json({ success: false, message: 'Tenant no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          nombre: tenant.nombre,
          subdominio: tenant.subdominio,
          status: tenant.status,
          trialEndsAt: tenant.trialEndsAt,
          planId: tenant.planId,
          planNombre: tenant.plan?.nombre ?? null,
        },
        suscripcion: suscripcion
          ? {
              id: suscripcion.id,
              planId: suscripcion.planId,
              planNombre: suscripcion.plan?.nombre,
              estado: suscripcion.estado,
              intervalo: suscripcion.intervalo,
              pagadoHasta: suscripcion.pagadoHasta,
              renovacionProxima: suscripcion.renovacionProxima,
              stripeCustomerId: suscripcion.stripeCustomerId,
              limiteVendedores: suscripcion.plan?.limietes.find((l) => l.recurso === 'MAX_VENDEDORES')?.valor ?? -1,
              limiteClientes: suscripcion.plan?.limietes.find((l) => l.recurso === 'MAX_CLIENTES')?.valor ?? -1,
            }
          : null,
        planes: planes.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          slug: p.slug,
          precioMensual: p.precioMensual,
          precioAnual: p.precioAnual,
          description: p.description,
        })),
        uso: {
          vendedores,
          clientes,
          prestamosActivos,
        },
      },
    })
  } catch (error) {
    console.error('[SUBSCRIPTIONS ME ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
