import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 6

    const skip = (page - 1) * limit

    const [articulos, total] = await Promise.all([
      prisma.articulo.findMany({
        take: limit,
        skip: skip,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.articulo.count(),
    ])

    return NextResponse.json({
      success: true,
      data: articulos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Blog API error:', error)
    return NextResponse.json({ success: false, message: 'Error al obtener artículos' }, { status: 500 })
  }
}
