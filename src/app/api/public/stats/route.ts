import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    cartera,
    prestamosActivos,
    totalPrestamos,
    clientes,
    agentes,
    moraAgg,
    cobrosSemana,
    empresasActivas,
    cobrosPorDia,
  ] = await Promise.all([
    prisma.prestamo.aggregate({ _sum: { montoTotal: true, saldoPendiente: true } }),
    prisma.prestamo.count({ where: { estado: 'activo' } }),
    prisma.prestamo.count(),
    prisma.usuario.count({ where: { rol: 'cliente' } }),
    prisma.usuario.count({ where: { rol: 'vendedor' } }),
    prisma.prestamo.aggregate({
      where: { estado: 'activo', diasAtrasados: { gt: 0 } },
      _sum: { saldoPendiente: true },
    }),
    prisma.pago.aggregate({ where: { fechaPago: { gte: weekAgo } }, _sum: { monto: true } }),
    prisma.tenant.count({ where: { slug: { not: 'platform' }, status: 'ACTIVE' } }),
    prisma.pago.groupBy({
      by: ['fechaPago'],
      where: { fechaPago: { gte: weekAgo } },
      _sum: { monto: true },
    }),
  ])

  const carteraTotal = Number(cartera._sum.montoTotal ?? 0)
  const saldoTotal = Number(cartera._sum.saldoPendiente ?? 0)
  const saldoMora = Number(moraAgg._sum.saldoPendiente ?? 0)

  const tasaMora = saldoTotal > 0 ? (saldoMora / saldoTotal) * 100 : 0

  const diaKey = (d: Date) => d.toISOString().slice(0, 10)
  const porFecha = new Map<string, number>()
  for (const g of cobrosPorDia) {
    porFecha.set(diaKey(g.fechaPago), Number(g._sum.monto ?? 0))
  }

  const max = Math.max(...Array.from(porFecha.values()), 1)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
    const key = diaKey(d)
    const monto = porFecha.get(key) ?? 0
    return {
      fecha: key,
      etiqueta: d.toLocaleDateString('es-CO', { weekday: 'short' }),
      monto,
      height: Math.round((monto / max) * 100),
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      carteraActiva: carteraTotal,
      saldoPendiente: saldoTotal,
      prestamosActivos,
      totalPrestamos,
      clientes,
      agentes,
      tasaMora: Number(tasaMora.toFixed(1)),
      cobrosSemana: Number(cobrosSemana._sum.monto ?? 0),
      empresasActivas,
      cobrosPorDia: dias,
    },
  })
}