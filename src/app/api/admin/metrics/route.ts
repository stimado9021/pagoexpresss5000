import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const USD_TO_COP = Number(process.env.WOMPI_USD_TO_COP) || 4000

type PagoPlataforma = {
  tenantId: number
  fecha: Date
  montoCop: number
  proveedor: string
}

// Los comprobantes de pago de la plataforma viven en `historial`:
// - Wompi CHECKOUT_COMPLETED: detalles { proveedor:'wompi', amount (centavos COP), ... }
// - Stripe PAYMENT_RECEIVED: detalles { amount (centavos USD), ... }
// (el CHECKOUT_COMPLETED de Stripe no trae monto y se ignora).
function parsePago(h: { tenantId: number | null; accion: string; detalles: string | null; createdAt: Date }): PagoPlataforma | null {
  if (h.tenantId == null || !h.detalles) return null
  let d: Record<string, unknown>
  try {
    d = JSON.parse(h.detalles) as Record<string, unknown>
  } catch {
    return null
  }
  const amount = Number(d.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (h.accion === 'CHECKOUT_COMPLETED' && d.proveedor !== 'wompi') return null
  if (h.accion !== 'CHECKOUT_COMPLETED' && h.accion !== 'PAYMENT_RECEIVED') return null
  const esCop = h.accion === 'CHECKOUT_COMPLETED' // wompi cobra en COP
  const montoCop = esCop ? Math.round(amount / 100) : Math.round((amount / 100) * USD_TO_COP)
  const proveedor = typeof d.proveedor === 'string' ? d.proveedor : h.accion === 'PAYMENT_RECEIVED' ? 'stripe' : 'otro'
  return { tenantId: h.tenantId, fecha: h.createdAt, montoCop, proveedor }
}

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalTenants, trialTenants, activeTenants, expiredTenants, suspendedTenants,
    totalUsuarios, totalPrestamos, totalPagos, tenant30d,
    tenants, pagosHistorial,
  ] = await Promise.all([
    prisma.tenant.count({ where: { slug: { not: 'platform' } } }),
    prisma.tenant.count({ where: { status: 'TRIAL', slug: { not: 'platform' } } }),
    prisma.tenant.count({ where: { status: 'ACTIVE', slug: { not: 'platform' } } }),
    prisma.tenant.count({ where: { status: 'TRIAL_EXPIRED', slug: { not: 'platform' } } }),
    prisma.tenant.count({ where: { status: 'SUSPENDED', slug: { not: 'platform' } } }),
    prisma.usuario.count({ where: { tenantId: { not: null } } }),
    prisma.prestamo.count(),
    prisma.pago.count(),
    prisma.tenant.count({ where: { slug: { not: 'platform' }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.tenant.findMany({
      where: { slug: { not: 'platform' } },
      select: {
        id: true, nombre: true, slug: true, subdominio: true, status: true, trialEndsAt: true, createdAt: true,
        plan: { select: { nombre: true, precioMensual: true } },
        suscripciones: {
          select: {
            estado: true, intervalo: true, cicloActual: true,
            pagadoHasta: true, renovacionProxima: true,
            wompiCustomerId: true, stripeSubscriptionId: true,
          },
        },
        _count: { select: { usuarios: true, prestamos: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.historial.findMany({
      where: { accion: { in: ['CHECKOUT_COMPLETED', 'PAYMENT_RECEIVED'] } },
      select: { tenantId: true, accion: true, detalles: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
  ])

  const pagos = pagosHistorial.map(parsePago).filter((p): p is PagoPlataforma => p !== null)
  const porTenant = new Map<number, PagoPlataforma[]>()
  for (const p of pagos) {
    const arr = porTenant.get(p.tenantId) ?? []
    arr.push(p)
    porTenant.set(p.tenantId, arr)
  }

  // Serie mensual últimos 6 meses (COP).
  const meses: { mes: string; etiqueta: string; cop: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    meses.push({
      mes: key,
      etiqueta: d.toLocaleDateString('es-CO', { month: 'short' }),
      cop: 0,
    })
  }
  const porMes = new Map(meses.map((m) => [m.mes, m]))
  const mesActualKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  for (const p of pagos) {
    const key = `${p.fecha.getFullYear()}-${String(p.fecha.getMonth() + 1).padStart(2, '0')}`
    const bucket = porMes.get(key)
    if (bucket) bucket.cop += p.montoCop
  }
  const recaudadoMesActual = porMes.get(mesActualKey)?.cop ?? 0
  const recaudadoTotal = pagos.reduce((s, p) => s + p.montoCop, 0)

  // MRR real: suscripciones ACTIVE con plan (precio mensual USD).
  let mrrUsd = 0
  const mrrPorPlan = new Map<string, { plan: string; n: number; mensualUsd: number }>()
  const empresas = tenants.map((t) => {
    const sub = t.suscripciones[0] ?? null
    const pagosT = porTenant.get(t.id) ?? []
    const totalPagadoCop = pagosT.reduce((s, p) => s + p.montoCop, 0)
    const ultimo = pagosT[0] ?? null
    if (sub?.estado === 'ACTIVE' && t.status === 'ACTIVE' && t.plan?.precioMensual != null) {
      const precio = Number(t.plan.precioMensual)
      mrrUsd += precio
      const entry = mrrPorPlan.get(t.plan.nombre) ?? { plan: t.plan.nombre, n: 0, mensualUsd: 0 }
      entry.n += 1
      entry.mensualUsd += precio
      mrrPorPlan.set(t.plan.nombre, entry)
    }
    const diasTrial = t.status === 'TRIAL'
      ? Math.max(0, Math.ceil((t.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null
    return {
      id: t.id,
      nombre: t.nombre,
      slug: t.slug,
      subdominio: t.subdominio,
      status: t.status,
      trialEndsAt: t.trialEndsAt,
      diasTrial,
      createdAt: t.createdAt,
      plan: t.plan?.nombre ?? 'Sin plan',
      precioMensualUsd: t.plan?.precioMensual != null ? Number(t.plan.precioMensual) : null,
      suscripcion: sub
        ? {
            estado: sub.estado,
            intervalo: sub.intervalo,
            cicloActual: sub.cicloActual,
            pagadoHasta: sub.pagadoHasta,
            renovacionProxima: sub.renovacionProxima,
            proveedor: sub.wompiCustomerId ? 'wompi' : sub.stripeSubscriptionId ? 'stripe' : null,
          }
        : null,
      totalPagadoCop,
      numPagos: pagosT.length,
      ultimoPago: ultimo
        ? { fecha: ultimo.fecha, montoCop: ultimo.montoCop, proveedor: ultimo.proveedor }
        : null,
      totalUsuarios: t._count.usuarios,
      totalPrestamos: t._count.prestamos,
    }
  })

  const mrrCop = Math.round(mrrUsd * USD_TO_COP)
  const pagadas = empresas.filter((e) => e.numPagos > 0).length

  return NextResponse.json({
    success: true,
    data: {
      conteos: {
        totalTenants, trialTenants, activeTenants, expiredTenants, suspendedTenants,
        totalUsuarios, totalPrestamos, totalPagos, tenant30d,
      },
      ingresos: {
        mrrUsd: Math.round(mrrUsd * 100) / 100,
        mrrCop,
        mrrPorPlan: [...mrrPorPlan.values()],
        recaudadoMesActualCop: recaudadoMesActual,
        recaudadoTotalCop: recaudadoTotal,
        empresasPagadas: pagadas,
        conversionTrial: totalTenants > 0 ? Number(((pagadas / totalTenants) * 100).toFixed(1)) : 0,
        porMes: meses,
      },
      empresas,
    },
  })
}
