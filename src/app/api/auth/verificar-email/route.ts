import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyEmailToken } from '@/lib/email-verification'
import { logSecurityEvent } from '@/lib/security-log'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 400 })
    }

    const result = verifyEmailToken(token)
    if (!result.valid || !result.email) {
      await logSecurityEvent('SUSPICIOUS_ACTIVITY', { action: 'invalid_email_verification', token })
      return NextResponse.json({ success: false, message: 'Token inválido o expirado' }, { status: 400 })
    }

    const user = await prisma.usuario.findFirst({
      where: { email: result.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: { activo: 1 },
    })

    await logSecurityEvent('AUTH_SUCCESS', { action: 'email_verified', userId: user.id })

    return NextResponse.json({ success: true, message: 'Email verificado correctamente' })
  } catch (error) {
    console.error('[EMAIL VERIFICATION ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
