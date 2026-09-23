import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail, layoutHtml, appUrl } from '@/lib/mail'
import { createResetToken } from '@/lib/reset-token'

const GENERIC_OK = 'Si el correo está registrado, enviamos un enlace para restablecer tu contraseña (válido 30 minutos). Revisa también spam.'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`recuperar:${ip}`, 5, 60_000)) {
      return NextResponse.json({ success: false, message: 'Demasiados intentos. Espera un minuto.' }, { status: 429 })
    }

    const { email } = await request.json().catch(() => ({}) as Record<string, unknown>)
    const query = String(email ?? '').trim().toLowerCase()

    // Respuesta genérica siempre: no revelar si el correo existe.
    if (query && query.includes('@')) {
      const users = await prisma.usuario.findMany({
        where: { email: query, activo: 1 },
        select: { id: true, nombre: true, apellido: true, email: true, rol: true },
        take: 10,
      })
      for (const u of users) {
        const full = await prisma.usuario.findUnique({ where: { id: u.id }, select: { password: true } })
        if (!full) continue
        const token = await createResetToken(u.id, full.password)
        const link = `${appUrl}/restablecer?token=${encodeURIComponent(token)}`
        await sendEmail({
          to: u.email!,
          subject: 'Restablece tu contraseña de Kreditools',
          html: layoutHtml(`
            <h1 style="font-size:20px;margin:0 0 12px;">Hola, ${u.nombre}.</h1>
            <p style="margin:0 0 16px;">Recibimos una solicitud para restablecer tu contraseña${u.rol && u.rol !== 'superadmin' ? ` (${u.rol})` : ''}. Si no fuiste tú, ignora este correo.</p>
            <p style="margin:0 0 20px;">El enlace vence en <strong>30 minutos</strong> y solo puede usarse una vez.</p>
            <a href="${link}" style="display:inline-block;background:#c9f24c;color:#022c22;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">Crear nueva contraseña</a>
            <p style="margin:20px 0 0;color:#a8a29e;font-size:12px;">Si el botón no funciona, copia este enlace: ${link}</p>
          `),
        })
      }
    }

    return NextResponse.json({ success: true, message: GENERIC_OK })
  } catch (error) {
    console.error('[RECUPERAR ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
