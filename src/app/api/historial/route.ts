import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'admin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tabla = searchParams.get('tabla') || 'pagos'
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const where: any = {
      accion: { in: ['editar_pago', 'eliminar_pago'] },
    }
    if (tabla) where.tablaAfectada = tabla

    const [total, registros] = await Promise.all([
      prisma.historial.count({ where }),
      prisma.historial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          usuario: { select: { nombre: true, apellido: true, cedula: true, rol: true } },
        },
      }),
    ])

    return NextResponse.json({ success: true, data: registros, total })
  } catch (error) {
    console.error('[HISTORIAL GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
