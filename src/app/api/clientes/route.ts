import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { calcularDiasAtrasados } from '@/lib/prestamo-utils'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rol = searchParams.get('rol')
  const buscar = searchParams.get('buscar')
  const id = searchParams.get('id')
  const resumen = searchParams.get('resumen')
  const clienteId = searchParams.get('cliente_id')
  const vendedorId = searchParams.get('vendedor_id')

  try {
    if (resumen && session.rol === 'vendedor') {
      const clientes = await prisma.usuario.findMany({
        where: { rol: 'cliente', vendedorId: session.userId },
        select: {
          id: true, cedula: true, nombre: true, apellido: true,
          telefono: true, email: true, direccion: true, activo: true, createdAt: true,
          prestamosCliente: {
            select: {
              id: true, estado: true, montoSolicitado: true, montoPagado: true,
              saldoPendiente: true, cuotaDiaria: true, diasAtrasados: true,
              diasPlazo: true, diasPagados: true, fechaInicio: true, montoTotal: true,
              fechaUltimoPago: true,
            },
          },
        },
        orderBy: { nombre: 'asc' },
      })
      const clientesConAtraso = clientes.map((c) => ({
        ...c,
        prestamosCliente: c.prestamosCliente.map((p) => ({
          ...p,
          diasAtrasados: calcularDiasAtrasados(p),
        })),
      }))
      return NextResponse.json({ success: true, data: clientesConAtraso })
    }

    if (vendedorId && session.rol === 'superadmin') {
      const clientes = await prisma.usuario.findMany({
        where: { rol: 'cliente', vendedorId: parseInt(vendedorId) },
        select: {
          id: true, cedula: true, nombre: true, apellido: true,
          telefono: true, email: true, direccion: true, activo: true, createdAt: true,
          prestamosCliente: {
            select: { estado: true, montoSolicitado: true, montoPagado: true, saldoPendiente: true, cuotaDiaria: true, diasAtrasados: true, fechaInicio: true, fechaUltimoPago: true, montoTotal: true },
          },
        },
        orderBy: { nombre: 'asc' },
      })
      const clientesConAtraso = clientes.map((c) => ({
        ...c,
        prestamosCliente: c.prestamosCliente.map((p) => ({
          ...p,
          diasAtrasados: calcularDiasAtrasados(p),
        })),
      }))
      return NextResponse.json({ success: true, data: clientesConAtraso })
    }

    if (rol && session.rol === 'superadmin') {
      const usuarios = await prisma.usuario.findMany({
        where: { rol },
        orderBy: { nombre: 'asc' },
        include: {
          _count: { select: { prestamosCliente: true } },
        },
      })
      const mapped = usuarios.map((u) => ({
        id: u.id,
        cedula: u.cedula,
        nombre: u.nombre,
        apellido: u.apellido,
        telefono: u.telefono,
        email: u.email,
        direccion: u.direccion,
        activo: u.activo,
        created_at: u.createdAt,
        prestamos: u._count.prestamosCliente,
      }))
      return NextResponse.json({ success: true, data: mapped })
    }

    if (buscar) {
      const term = `%${buscar}%`
      const whereClause: any = {
        rol: 'cliente',
        OR: [
          { cedula: { contains: buscar } },
          { nombre: { contains: buscar } },
          { apellido: { contains: buscar } },
        ],
      }
      if (session.rol === 'vendedor') {
        whereClause.vendedorId = session.userId
      }
      const clientes = await prisma.usuario.findMany({
        where: whereClause,
        select: { id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true, activo: true, createdAt: true },
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
        take: 50,
      })
      return NextResponse.json({ success: true, data: clientes })
    }

    if (id) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: parseInt(id) },
        select: { id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true, activo: true },
      })
      if (!usuario) {
        return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 })
      }
      const prestamosRaw = await prisma.prestamo.findMany({
        where: { clienteId: usuario.id },
        orderBy: { fechaInicio: 'desc' },
        include: { pagos: { orderBy: { fechaPago: 'desc' } } },
      })
      const prestamos = prestamosRaw.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))
      return NextResponse.json({ success: true, data: { ...usuario, prestamos } })
    }

    if (resumen && clienteId) {
      const id = parseInt(clienteId)
      const rawPrestamos = await prisma.prestamo.findMany({
        where: { clienteId: id },
        orderBy: { createdAt: 'desc' },
      })
      const prestamos = rawPrestamos.map((p) => ({
        ...p,
        diasAtrasados: calcularDiasAtrasados(p),
      }))
      const totales = prestamos.reduce(
        (acc, p) => ({
          total_prestamos: acc.total_prestamos + 1,
          prestamos_activos: acc.prestamos_activos + (p.estado === 'activo' ? 1 : 0),
          prestamos_pagados: acc.prestamos_pagados + (p.estado === 'pagado' ? 1 : 0),
          monto_total_prestado: acc.monto_total_prestado + Number(p.montoTotal),
          monto_total_pagado: acc.monto_total_pagado + Number(p.montoPagado),
          saldo_total_pendiente: acc.saldo_total_pendiente + Number(p.saldoPendiente),
        }),
        { total_prestamos: 0, prestamos_activos: 0, prestamos_pagados: 0, monto_total_prestado: 0, monto_total_pagado: 0, saldo_total_pendiente: 0 }
      )
      return NextResponse.json({ success: true, data: { prestamos, totales } })
    }

    return NextResponse.json({ success: false, message: 'Parámetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('[CLIENTES GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.rol !== 'superadmin' && session.rol !== 'vendedor')) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const datos = await request.json()
    if (!datos.nombre || !datos.cedula) {
      return NextResponse.json({ success: false, message: 'Datos incompletos' }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { cedula: datos.cedula } })
    if (existing) {
      return NextResponse.json({ success: false, message: 'La cédula ya existe' }, { status: 400 })
    }

    const passHash = await bcrypt.hash(datos.cedula, 10)
    const usuario = await prisma.usuario.create({
      data: {
        cedula: datos.cedula,
        nombre: datos.nombre,
        apellido: datos.apellido || '',
        telefono: datos.telefono || null,
        email: datos.email || null,
        direccion: datos.direccion || null,
        rol: 'cliente',
        password: passHash,
        activo: 1,
        vendedorId: datos.vendedor_id ? parseInt(datos.vendedor_id) : session.userId,
      },
    })

    return NextResponse.json({ success: true, message: 'Cliente creado correctamente', data: { id: usuario.id } }, { status: 201 })
  } catch (error) {
    console.error('[CLIENTES POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear cliente' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || (session.rol !== 'superadmin' && session.rol !== 'vendedor')) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const datos = await request.json()
    if (!datos.id) {
      return NextResponse.json({ success: false, message: 'ID del cliente requerido' }, { status: 400 })
    }

    const cliente = await prisma.usuario.findUnique({ where: { id: datos.id } })
    if (!cliente) {
      return NextResponse.json({ success: false, message: 'Cliente no encontrado' }, { status: 404 })
    }

    if (session.rol === 'vendedor' && cliente.vendedorId !== session.userId) {
      return NextResponse.json({ success: false, message: 'No autorizado para editar este cliente' }, { status: 403 })
    }

    const updated = await prisma.usuario.update({
      where: { id: datos.id },
      data: {
        nombre: datos.nombre ?? cliente.nombre,
        apellido: datos.apellido ?? cliente.apellido,
        telefono: datos.telefono !== undefined ? datos.telefono || null : cliente.telefono,
        email: datos.email !== undefined ? datos.email || null : cliente.email,
        direccion: datos.direccion !== undefined ? datos.direccion || null : cliente.direccion,
      },
      select: { id: true, cedula: true, nombre: true, apellido: true, telefono: true, email: true, direccion: true },
    })

    return NextResponse.json({ success: true, message: 'Cliente actualizado correctamente', data: updated })
  } catch (error) {
    console.error('[CLIENTES PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al actualizar cliente' }, { status: 500 })
  }
}
