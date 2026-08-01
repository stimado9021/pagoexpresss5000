import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'
import { sendWhatsAppText, formatNuevoPrestamo } from '@/lib/evolution-api'

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
    let clienteId = data.cliente_id ? parseInt(data.cliente_id) : null

    let telefono: string | null = null
    let nombreCliente = ''

    if (!clienteId) {
      telefono = data.telefono?.replace(/[^0-9]/g, '') || null
      const passHash = await bcrypt.hash(data.cedula, 10)
       const nuevo = await prisma.usuario.create({
       data: {
         cedula: data.cedula,
         nombre: data.nombre,
         apellido: data.apellido || '',
         telefono,
         rol: 'cliente',
         password: passHash,
         vendedorId: session.userId,
         tenantId: session.tenantId!,
       },
     })
      clienteId = nuevo.id
      nombreCliente = `${data.nombre} ${data.apellido || ''}`.trim()
    } else {
      const cliente = await prisma.usuario.findUnique({
        where: { id: clienteId },
        select: { nombre: true, apellido: true, telefono: true },
      })
      if (cliente) {
        telefono = cliente.telefono
        nombreCliente = `${cliente.nombre} ${cliente.apellido}`.trim()
      }
    }

    const config = await prisma.configuracion.findFirst()
    const tasa = config ? Number(config.tasaInteres) : 20.00
    const cuotaConfig = config && Number(config.cuotaDiariaMinima) > 0 ? Number(config.cuotaDiariaMinima) : 5000

    const montoSolicitado = Number(data.monto)
    const interesNuevo = montoSolicitado * (tasa / 100)
    const montoNuevoConInteres = montoSolicitado + interesNuevo

    const prestamoActivo = await prisma.prestamo.findFirst({
      where: { clienteId, estado: 'activo' },
      orderBy: { createdAt: 'desc' },
    })

    if (prestamoActivo) {
      const saldoExistente = Number(prestamoActivo.saldoPendiente)
      const nuevoMontoTotal = Number(prestamoActivo.montoTotal) + montoNuevoConInteres
      const nuevoSaldo = saldoExistente + montoNuevoConInteres
      const nuevoInteresTotal = Number(prestamoActivo.interesTotal) + interesNuevo
      const nuevasDias = Math.ceil(nuevoMontoTotal / cuotaConfig)
      const nuevaFechaFin = new Date(prestamoActivo.fechaInicio)
      nuevaFechaFin.setDate(nuevaFechaFin.getDate() + nuevasDias)

      const prestamo = await prisma.prestamo.update({
        where: { id: prestamoActivo.id },
        data: {
          montoSolicitado: Number(prestamoActivo.montoSolicitado) + montoSolicitado,
          interesTotal: nuevoInteresTotal,
          montoTotal: nuevoMontoTotal,
          saldoPendiente: nuevoSaldo,
          diasPlazo: nuevasDias,
          fechaFinEsperada: nuevaFechaFin,
        },
      })

      if (telefono) {
        const msg = formatNuevoPrestamo({
          cliente: nombreCliente,
          montoSolicitado,
          tasaInteres: tasa,
          interesTotal: interesNuevo,
          montoTotal: montoNuevoConInteres,
          cuotaDiaria: cuotaConfig,
          diasPlazo: nuevasDias,
          esConsolidacion: true,
          deudaPrevia: saldoExistente,
        })
        sendWhatsAppText(telefono, msg)
      }

      return NextResponse.json({ success: true, message: 'Préstamo anexado al saldo existente', data: prestamo })
    }

    const diasPlazo = Math.ceil(montoNuevoConInteres / cuotaConfig)
    const fechaInicio = new Date()
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + diasPlazo)

     const prestamo = await prisma.prestamo.create({
       data: {
         clienteId,
         vendedorId: session.userId,
         tenantId: session.tenantId!,
         montoSolicitado,
         tasaInteres: tasa,
         interesTotal: interesNuevo,
         montoTotal: montoNuevoConInteres,
         cuotaDiaria: cuotaConfig,
         diasPlazo,
         saldoPendiente: montoNuevoConInteres,
         estado: 'activo',
         fechaInicio,
         fechaFinEsperada: fechaFin,
       },
     })

    if (telefono) {
      const msg = formatNuevoPrestamo({
        cliente: nombreCliente,
        montoSolicitado,
        tasaInteres: tasa,
        interesTotal: interesNuevo,
        montoTotal: montoNuevoConInteres,
        cuotaDiaria: cuotaConfig,
        diasPlazo,
      })
      sendWhatsAppText(telefono, msg)
    }

    return NextResponse.json({ success: true, message: 'Préstamo registrado con éxito', data: prestamo })
  } catch (error) {
    console.error('[PRESTAMOS POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear préstamo' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clienteId = searchParams.get('cliente_id')

  try {
    if (clienteId) {
      const rawPrestamos = await prisma.prestamo.findMany({
        where: { clienteId: parseInt(clienteId) },
        orderBy: { createdAt: 'desc' },
        include: { pagos: { orderBy: { fechaPago: 'desc' } } },
      })
      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))
      return NextResponse.json({ success: true, data: prestamos })
    }

    if (session.rol === 'cliente') {
      const rawPrestamos = await prisma.prestamo.findMany({
        where: { clienteId: session.userId },
        orderBy: { createdAt: 'desc' },
      })
      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))
      return NextResponse.json({ success: true, data: prestamos })
    }

    if (session.rol === 'vendedor') {
      const rawPrestamos = await prisma.prestamo.findMany({
        where: { vendedorId: session.userId },
        orderBy: { createdAt: 'desc' },
        include: {
          cliente: { select: { nombre: true, apellido: true, cedula: true } },
        },
      })
      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))
      return NextResponse.json({ success: true, data: prestamos })
    }

    const rawPrestamos = await prisma.prestamo.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { nombre: true, apellido: true, cedula: true } },
        vendedor: { select: { nombre: true, apellido: true } },
      },
    })
    const prestamos = rawPrestamos.map((p) => ({
      ...p,
      diasAtrasados: calcularDiasAtrasados(p),
    }))
    return NextResponse.json({ success: true, data: prestamos })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
