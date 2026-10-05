import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generate2FACode, verify2FACode } from '@/lib/two-fa'
import { logSecurityEvent } from '@/lib/security-log'

export async function POST(request: Request) {
  try {
    const { action, userId, code } = await request.json()

    if (action === 'generate') {
      if (!userId || typeof userId !== 'number') {
        return NextResponse.json({ success: false, message: 'userId requerido' }, { status: 400 })
      }

      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { id: true, email: true, rol: true },
      })

      if (!user || user.rol !== 'superadmin') {
        return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
      }

      const code = generate2FACode(userId)

      await logSecurityEvent('AUTH_SUCCESS', { action: '2fa_code_generated', userId })

      return NextResponse.json({
        success: true,
        message: 'Código 2FA generado',
        demo_code: process.env.NODE_ENV !== 'production' ? code : undefined,
      })
    }

    if (action === 'verify') {
      if (!userId || typeof userId !== 'number' || !code || typeof code !== 'string') {
        return NextResponse.json({ success: false, message: 'userId y code requeridos' }, { status: 400 })
      }

      const valid = verify2FACode(userId, code)
      if (!valid) {
        await logSecurityEvent('AUTH_FAILURE', { action: '2fa_invalid', userId })
        return NextResponse.json({ success: false, message: 'Código inválido o expirado' }, { status: 401 })
      }

      await logSecurityEvent('AUTH_SUCCESS', { action: '2fa_verified', userId })
      return NextResponse.json({ success: true, message: '2FA verificado' })
    }

    return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('[2FA ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
