import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })

  try {
    if (session.rol === 'superadmin') {
      const vendedores = await prisma.usuario.findMany({
        where: { rol: 'vendedor', activo: 1 },
        select: {
          id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true,
          _count: { select: { clientes: true } },
          prestamosCreados: { select: { montoSolicitado: true, estado: true } },
        },
      })

      const rawClientes = await prisma.prestamo.findMany({
        where: { estado: 'activo' },
        select: {
          cliente: { select: { nombre: true, apellido: true } },
          cuotaDiaria: true,
          saldoPendiente: true,
          diasAtrasados: true,
          fechaInicio: true,
          fechaUltimoPago: true,
          estado: true,
          vendedor: { select: { nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      const clientes = rawClientes.map((c) => ({
        ...c,
        diasAtrasados: calcularDiasAtrasados(c),
      }))

      const stats = {
        total_vendedores: vendedores.length,
        colocacion_total: vendedores.reduce((sum, v) =>
          sum + v.prestamosCreados.reduce((s, p) => s + Number(p.montoSolicitado), 0), 0),
        atrasados: clientes.filter((c) => c.diasAtrasados > 0).length,
      }

      const mappedVendedores = vendedores.map((v) => ({
        id: v.id,
        cedula: v.cedula,
        nombre: v.nombre,
        apellido: v.apellido,
        telefono: v.telefono,
        email: v.email,
        total_clientes: v._count.clientes,
        total_prestado: v.prestamosCreados.reduce((s, p) => s + Number(p.montoSolicitado), 0),
      }))

      return NextResponse.json({
        success: true,
        data: { vendedores: mappedVendedores, clientes, stats },
      })
    }

    if (session.rol === 'vendedor') {
      const [rawPrestamos, totalClientes] = await Promise.all([
        prisma.prestamo.findMany({
          where: { vendedorId: session.userId },
          include: {
            cliente: { select: { nombre: true, apellido: true, cedula: true } },
            pagos: { orderBy: { fechaPago: 'desc' }, take: 1 },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.usuario.count({ where: { rol: 'cliente', vendedorId: session.userId } }),
      ])

      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))

      const stats = {
        total_prestamos: prestamos.length,
        activos: prestamos.filter((p) => p.estado === 'activo').length,
        pagados: prestamos.filter((p) => p.estado === 'pagado').length,
        monto_prestado: prestamos.reduce((s, p) => s + Number(p.montoSolicitado), 0),
        monto_recuperado: prestamos.reduce((s, p) => s + Number(p.montoPagado), 0),
        saldo_pendiente: prestamos.reduce((s, p) => s + Number(p.saldoPendiente), 0),
        total_clientes: totalClientes,
      }

      return NextResponse.json({ success: true, data: { prestamos, stats } })
    }

    if (session.rol === 'cliente') {
      const [usuario, rawPrestamos] = await Promise.all([
        prisma.usuario.findUnique({
          where: { id: session.userId },
          select: { cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true },
        }),
        prisma.prestamo.findMany({
          where: { clienteId: session.userId },
          orderBy: { createdAt: 'desc' },
          include: { pagos: { orderBy: { fechaPago: 'desc' } } },
        }),
      ])
      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))

      return NextResponse.json({ success: true, data: { cliente: usuario, prestamos } })
    }

    return NextResponse.json({ success: false, message: 'Rol no válido' }, { status: 400 })
  } catch (error) {
    console.error('[DASHBOARD ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
