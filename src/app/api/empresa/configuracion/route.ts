import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'empresario' || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    let config = await prisma.configuracionTenant.findUnique({ where: { tenantId: session.tenantId } })
    if (!config) {
      config = await prisma.configuracionTenant.create({
        data: { tenantId: session.tenantId },
      })
    }
    return NextResponse.json({
      success: true,
      data: {
        tasaInteres: Number(config.tasaInteres),
        cuotaDiariaMin: Number(config.cuotaDiariaMin),
        nombreEmpresa: config.nombreEmpresa,
        logoUrl: config.logoUrl,
      },
    })
  } catch (error) {
    console.error('[EMPRESA CONFIG GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'empresario' || !session.tenantId) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const tasaInteres = parseFloat(data.tasaInteres)
    const cuotaDiariaMin = parseFloat(data.cuotaDiariaMin)

    if (isNaN(tasaInteres) || tasaInteres <= 0) {
      return NextResponse.json({ success: false, message: 'Tasa de interés inválida' }, { status: 400 })
    }
    if (isNaN(cuotaDiariaMin) || cuotaDiariaMin < 0) {
      return NextResponse.json({ success: false, message: 'Cuota diaria mínima inválida' }, { status: 400 })
    }

    const config = await prisma.configuracionTenant.upsert({
      where: { tenantId: session.tenantId },
      update: { tasaInteres, cuotaDiariaMin },
      create: { tenantId: session.tenantId, tasaInteres, cuotaDiariaMin },
    })

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada',
      data: { tasaInteres: Number(config.tasaInteres), cuotaDiariaMin: Number(config.cuotaDiariaMin) },
    })
  } catch (error) {
    console.error('[EMPRESA CONFIG PUT ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
