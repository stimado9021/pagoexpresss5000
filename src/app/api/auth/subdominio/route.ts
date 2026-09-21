import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isReservedSubdomain, normalizeSubdomainSlug } from '@/lib/domains'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || ''

  const clean = normalizeSubdomainSlug(slug)

  if (clean.length < 3) {
    return NextResponse.json({ success: true, available: false, slug: clean, reason: 'Muy corto' })
  }

  if (isReservedSubdomain(clean)) {
    return NextResponse.json({ success: true, available: false, slug: clean, reason: 'Reservado' })
  }

  const existing = await prisma.tenant.findUnique({ where: { slug: clean } })
  return NextResponse.json({
    success: true,
    available: !existing,
    slug: clean,
    reason: existing ? 'Ya está en uso' : 'Disponible',
  })
}
