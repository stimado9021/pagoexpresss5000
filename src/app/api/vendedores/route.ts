import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    if (!data.nombre || !data.cedula) {
      return NextResponse.json({ success: false, message: 'Nombre y cédula requeridos' }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { cedula: data.cedula } })
    if (existing) {
      return NextResponse.json({ success: false, message: 'La cédula ya existe' }, { status: 400 })
    }

    const passHash = await bcrypt.hash(data.cedula, 10)
    const vendedor = await prisma.usuario.create({
      data: {
        cedula: data.cedula,
        nombre: data.nombre,
        apellido: data.apellido || '',
        telefono: data.telefono || null,
        direccion: data.direccion || null,
        email: data.email || null,
        rol: 'vendedor',
        password: passHash,
        activo: 1,
      },
    })

    return NextResponse.json({ success: true, message: 'Vendedor creado', data: { id: vendedor.id } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error al crear vendedor' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      const vendedor = await prisma.usuario.findFirst({
        where: { id: parseInt(id), rol: 'vendedor' },
        select: {
          id: true, cedula: true, nombre: true, apellido: true,
          telefono: true, email: true, direccion: true, activo: true,
          _count: { select: { clientes: true } },
          clientes: {
            select: {
              id: true, cedula: true, nombre: true, apellido: true,
              telefono: true, email: true, direccion: true, activo: true,
              createdAt: true,
              prestamosCliente: {
                select: { estado: true, montoSolicitado: true, montoPagado: true, saldoPendiente: true },
              },
            },
          },
        },
      })
      if (!vendedor) {
        return NextResponse.json({ success: false, message: 'Vendedor no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ success: true, data: vendedor })
    }

    const vendedores = await prisma.usuario.findMany({
      where: { rol: 'vendedor' },
      select: {
        id: true, cedula: true, nombre: true, apellido: true,
        telefono: true, email: true, direccion: true, activo: true,
        _count: { select: { clientes: true } },
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ success: true, data: vendedores })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
