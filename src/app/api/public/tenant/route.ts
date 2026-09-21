import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Branding público mínimo de un espacio de trabajo (para login por subdominio). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = String(searchParams.get('slug') ?? '').toLowerCase().trim()
  if (!slug || slug.length > 100) {
    return NextResponse.json({ success: false, message: 'Slug requerido' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      nombre: true,
      slug: true,
      status: true,
      configuracion: { select: { nombreEmpresa: true, logoUrl: true } },
    },
  })
  if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELLED') {
    return NextResponse.json({ success: false, message: 'Espacio no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      slug: tenant.slug,
      nombre: tenant.configuracion?.nombreEmpresa || tenant.nombre,
      logoUrl: tenant.configuracion?.logoUrl || null,
    },
  })
}
