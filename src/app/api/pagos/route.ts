import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendWhatsAppText, formatReceipt } from '@/lib/evolution-api'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.rol === 'cliente') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  if (session.tenantId) {
    const { checkTenantActive } = await import('@/lib/tenant')
    const active = await checkTenantActive(session.tenantId)
    if (!active.ok) {
      return NextResponse.json({ success: false, message: active.message }, { status: 403 })
    }
  }

  try {
    const data = await request.json()
    const prestamoId = parseInt(data.prestamo_id)
    const monto = Number(data.monto)
    const enviarWhatsApp = data.enviarWhatsApp !== false

    const prestamo = await prisma.prestamo.findUnique({
      where: { id: prestamoId },
      include: { cliente: { select: { nombre: true, apellido: true, telefono: true } } },
    })
    if (!prestamo) {
      return NextResponse.json({ success: false, message: 'Préstamo no encontrado' }, { status: 404 })
    }

    const nuevoPagado = Number(prestamo.montoPagado) + monto
    const nuevoSaldo = Math.max(0, Number(prestamo.saldoPendiente) - monto)
    const diasCubiertos = Math.ceil(monto / Number(prestamo.cuotaDiaria))
    const diasAtraso = Math.max(0, (prestamo.fechaUltimoPago
      ? Math.floor((Date.now() - new Date(prestamo.fechaUltimoPago).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((Date.now() - new Date(prestamo.fechaInicio).getTime()) / (1000 * 60 * 60 * 24))) - 1)

    const [pago] = await prisma.$transaction([
      prisma.pago.create({
        data: {
          prestamoId,
          vendedorId: session.userId,
          tenantId: session.tenantId!,
          fechaPago: new Date(),
          fechaEsperada: prestamo.fechaUltimoPago || prestamo.fechaInicio,
          monto,
          diasCubiertos,
          esPagoAtrasado: diasAtraso > 0 ? 1 : 0,
          diasAtraso,
          observaciones: data.observaciones || null,
        },
      }),
      prisma.prestamo.update({
        where: { id: prestamoId },
        data: {
          montoPagado: nuevoPagado,
          saldoPendiente: nuevoSaldo,
          diasPagados: { increment: diasCubiertos },
          fechaUltimoPago: new Date(),
          estado: nuevoSaldo <= 0 ? 'pagado' : 'activo',
          diasAtrasados: diasAtraso > 0 ? diasAtraso : 0,
        },
      }),
    ])

    if (enviarWhatsApp && prestamo.cliente.telefono) {
      const receipt = formatReceipt({
        cliente: `${prestamo.cliente.nombre} ${prestamo.cliente.apellido}`,
        monto,
        fecha: new Date(),
        cuotaDiaria: Number(prestamo.cuotaDiaria),
        saldoPendiente: nuevoSaldo,
      })
      sendWhatsAppText(prestamo.cliente.telefono, receipt)
    }

    return NextResponse.json({ success: true, message: 'Pago registrado', data: pago })
  } catch (error) {
    console.error('[PAGOS POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al registrar pago' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.rol === 'cliente') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const pagoId = parseInt(data.pago_id)
    const motivo = (data.motivo || '').trim()
    if (!motivo) {
      return NextResponse.json({ success: false, message: 'El motivo es obligatorio' }, { status: 400 })
    }

    const pagoOrig = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { prestamo: true },
    })
    if (!pagoOrig) {
      return NextResponse.json({ success: false, message: 'Pago no encontrado' }, { status: 404 })
    }

    if (session.rol === 'vendedor' && pagoOrig.vendedorId !== session.userId) {
      return NextResponse.json({ success: false, message: 'No puedes editar pagos de otro vendedor' }, { status: 403 })
    }

    const prestamo = pagoOrig.prestamo
    const montoOrig = Number(pagoOrig.monto)
    const montoNuevo = data.monto !== undefined ? Number(data.monto) : montoOrig
    const fechaNueva = data.fechaPago ? new Date(data.fechaPago) : pagoOrig.fechaPago
    const diferencia = montoNuevo - montoOrig

    const nuevoMontoPagado = Number(prestamo.montoPagado) + diferencia
    const nuevoSaldo = Math.max(0, Number(prestamo.saldoPendiente) - diferencia)
    const nuevosDiasPagados = Math.max(0, Math.floor(nuevoMontoPagado / Number(prestamo.cuotaDiaria)))

    await prisma.$transaction([
      prisma.pago.update({
        where: { id: pagoId },
        data: {
          monto: montoNuevo,
          fechaPago: fechaNueva,
          diasCubiertos: Math.ceil(montoNuevo / Number(prestamo.cuotaDiaria)),
          observaciones: `${pagoOrig.observaciones || ''} | Editado: ${motivo}`.trim().replace(/^\| /, ''),
        },
      }),
      prisma.prestamo.update({
        where: { id: prestamo.id },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldo,
          diasPagados: nuevosDiasPagados,
          estado: nuevoSaldo <= 0 ? 'pagado' : 'activo',
        },
      }),
      prisma.historial.create({
        data: {
          usuarioId: session.userId,
          tenantId: session.tenantId || 1,
          accion: 'editar_pago',
          tablaAfectada: 'pagos',
          registroId: pagoId,
          detalles: JSON.stringify({
            anterior: { monto: montoOrig, fecha: pagoOrig.fechaPago.toISOString() },
            nuevo: { monto: montoNuevo, fecha: fechaNueva.toISOString() },
            motivo,
          }),
        },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Pago actualizado' })
  } catch (error) {
    console.error('[PAGOS PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al editar pago' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session || session.rol === 'cliente') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const pagoId = parseInt(data.pago_id)
    const motivo = (data.motivo || '').trim()
    if (!motivo) {
      return NextResponse.json({ success: false, message: 'El motivo es obligatorio' }, { status: 400 })
    }

    const pagoOrig = await prisma.pago.findUnique({
      where: { id: pagoId },
      include: { prestamo: true },
    })
    if (!pagoOrig) {
      return NextResponse.json({ success: false, message: 'Pago no encontrado' }, { status: 404 })
    }

    if (session.rol === 'vendedor' && pagoOrig.vendedorId !== session.userId) {
      return NextResponse.json({ success: false, message: 'No puedes eliminar pagos de otro vendedor' }, { status: 403 })
    }

    const prestamo = pagoOrig.prestamo
    const montoEliminado = Number(pagoOrig.monto)
    const nuevoMontoPagado = Math.max(0, Number(prestamo.montoPagado) - montoEliminado)
    const nuevoSaldo = Number(prestamo.saldoPendiente) + montoEliminado
    const nuevosDiasPagados = Math.max(0, Math.floor(nuevoMontoPagado / Number(prestamo.cuotaDiaria)))

    await prisma.$transaction([
      prisma.pago.delete({ where: { id: pagoId } }),
      prisma.prestamo.update({
        where: { id: prestamo.id },
        data: {
          montoPagado: nuevoMontoPagado,
          saldoPendiente: nuevoSaldo,
          diasPagados: nuevosDiasPagados,
          estado: 'activo',
        },
      }),
      prisma.historial.create({
        data: {
          usuarioId: session.userId,
          tenantId: session.tenantId || 1,
          accion: 'eliminar_pago',
          tablaAfectada: 'pagos',
          registroId: pagoId,
          detalles: JSON.stringify({
            anterior: { monto: montoEliminado, fecha: pagoOrig.fechaPago.toISOString() },
            motivo,
          }),
        },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Pago eliminado' })
  } catch (error) {
    console.error('[PAGOS DELETE ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al eliminar pago' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const prestamoId = searchParams.get('prestamo_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const where: any = {}
    if (prestamoId) where.prestamoId = parseInt(prestamoId)
    if (session.rol === 'vendedor') where.vendedorId = session.userId
    if (session.rol === 'cliente') {
      const prestamos = await prisma.prestamo.findMany({ where: { clienteId: session.userId }, select: { id: true } })
      where.prestamoId = { in: prestamos.map((p) => p.id) }
    }

    const pagos = await prisma.pago.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        prestamo: {
          select: {
            clienteId: true, montoTotal: true,
            cliente: { select: { nombre: true, apellido: true, cedula: true } },
          },
        },
        vendedor: { select: { nombre: true, apellido: true } },
      },
    })

    return NextResponse.json({ success: true, data: pagos })
  } catch (error) {
    console.error('[PAGOS GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
