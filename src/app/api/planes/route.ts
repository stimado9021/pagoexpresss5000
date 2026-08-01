import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const planes = await prisma.plan.findMany({
      where: { activo: true },
      orderBy: { precioMensual: 'asc' },
      select: {
        id: true,
        nombre: true,
        slug: true,
        precioMensual: true,
        precioAnual: true,
        description: true,
        trialDays: true,
        limietes: {
          select: { recurso: true, valor: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: planes })
  } catch (error) {
    console.error('[PLANES GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
