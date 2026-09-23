import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyResetToken } from '@/lib/reset-token'
import { buildTenantUrl } from '@/lib/domains'

const INVALIDO = 'Enlace inválido, vencido o ya utilizado. Solicita uno nuevo.'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`restablecer:${ip}`, 10, 60_000)) {
      return NextResponse.json({ success: false, message: 'Demasiados intentos. Espera un minuto.' }, { status: 429 })
    }

    const { token, nuevaPassword } = await request.json().catch(() => ({}) as Record<string, unknown>)
    if (typeof token !== 'string' || !token) {
      return NextResponse.json({ success: false, message: INVALIDO }, { status: 400 })
    }
    if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 8) {
      return NextResponse.json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const claims = await verifyResetToken(token)
    if (!claims) {
      return NextResponse.json({ success: false, message: INVALIDO }, { status: 400 })
    }

    const user = await prisma.usuario.findUnique({
      where: { id: claims.userId },
      select: { id: true, password: true, activo: true, tenantId: true },
    })
    if (!user || user.activo !== 1) {
      return NextResponse.json({ success: false, message: INVALIDO }, { status: 400 })
    }
    // Un solo uso: si la clave cambió desde que se emitió el token, muere.
    if (user.password.slice(0, 24) !== claims.ph) {
      return NextResponse.json({ success: false, message: INVALIDO }, { status: 400 })
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: { password: await hashPassword(nuevaPassword) },
    })

    let loginUrl = '/login'
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true } })
      if (tenant?.slug) loginUrl = `${buildTenantUrl(tenant.slug)}/login`
    }

    return NextResponse.json({ success: true, message: 'Contraseña actualizada. Ya puedes ingresar.', loginUrl })
  } catch (error) {
    console.error('[RESTABLECER ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
