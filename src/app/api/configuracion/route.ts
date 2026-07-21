import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    let config = await prisma.configuracion.findFirst()
    if (!config) {
      config = await prisma.configuracion.create({
        data: { tasaInteres: 20.00, cuotaDiariaMinima: 5000 },
      })
    }
    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('[CONFIG GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const tasaInteres = parseFloat(data.tasaInteres)
    const cuotaDiariaMinima = parseFloat(data.cuotaDiariaMinima)

    if (isNaN(tasaInteres) || tasaInteres <= 0) {
      return NextResponse.json({ success: false, message: 'Tasa de interés inválida' }, { status: 400 })
    }
    if (isNaN(cuotaDiariaMinima) || cuotaDiariaMinima <= 0) {
      return NextResponse.json({ success: false, message: 'Cuota diaria mínima inválida' }, { status: 400 })
    }

    let config = await prisma.configuracion.findFirst()
    if (config) {
      config = await prisma.configuracion.update({
        where: { id: config.id },
        data: { tasaInteres, cuotaDiariaMinima },
      })
    } else {
      config = await prisma.configuracion.create({
        data: { tasaInteres, cuotaDiariaMinima },
      })
    }

    return NextResponse.json({ success: true, message: 'Configuración actualizada', data: config })
  } catch (error) {
    console.error('[CONFIG PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
