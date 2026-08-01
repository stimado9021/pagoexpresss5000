import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || ''

  const clean = slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  if (clean.length < 3) {
    return NextResponse.json({ success: true, available: false, slug: clean, reason: 'Muy corto' })
  }

  const reserved = ['platform', 'admin', 'api', 'login', 'www', 'app', 'mail', 'soporte', 'demo']
  if (reserved.includes(clean)) {
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
