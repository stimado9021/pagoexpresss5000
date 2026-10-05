import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const articulo = await prisma.articulo.findUnique({
      where: { slug },
    })

    if (!articulo) {
      return NextResponse.json({ success: false, message: 'Artículo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: articulo })
  } catch (error) {
    console.error('Blog detail API error:', error)
    return NextResponse.json({ success: false, message: 'Error al obtener el artículo' }, { status: 500 })
  }
}
