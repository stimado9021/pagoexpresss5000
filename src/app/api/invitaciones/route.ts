import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendEmail, layoutHtml, appUrl } from '@/lib/mail'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || (session.rol !== 'superadmin' && session.rol !== 'empresario')) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const { email, rol } = await request.json()
    if (!email || !['vendedor', 'cliente'].includes(rol)) {
      return NextResponse.json({ success: false, message: 'Email y rol requeridos' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Correo electrónico inválido' }, { status: 400 })
    }

    if (session.rol === 'empresario' && session.tenantId && rol === 'vendedor') {
      const { checkTenantLimit } = await import('@/lib/tenant')
      const limitCheck = await checkTenantLimit(session.tenantId, 'MAX_VENDEDORES')
      if (!limitCheck.ok) {
        return NextResponse.json({ success: false, message: limitCheck.message }, { status: 403 })
      }
    }

    const existingUser = await prisma.usuario.findFirst({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Ya existe un usuario con este correo' }, { status: 409 })
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invitacion = await prisma.invitacion.create({
      data: {
        tenantId: session.tenantId!,
        email,
        rol,
        token,
        invitadoPor: session.userId,
        expiresAt,
      },
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId! },
      select: { nombre: true },
    })

    const rolLabel = rol === 'vendedor' ? 'vendedor' : 'cliente'
    const acceptUrl = `${appUrl}/aceptar-invitacion?token=${token}`

    await sendEmail({
      to: email,
      subject: `Te invitaron a ${tenant?.nombre ?? 'Kredipay'}`,
      html: layoutHtml(`
        <h1 style="font-size:20px;margin:0 0 12px;">Has sido invitado</h1>
        <p style="margin:0 0 16px;">
          <strong>${tenant?.nombre ?? 'Kredipay'}</strong> te invitó a unirte como <strong>${rolLabel}</strong> en su sistema Kredipay.
        </p>
        <p style="margin:0 0 20px;">El enlace de invitación es válido por 7 días.</p>
        <a href="${acceptUrl}" style="display:inline-block;background:#c9f24c;color:#022c22;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">
          Aceptar invitación
        </a>
        <p style="margin:20px 0 0;color:#a8a29e;font-size:12px;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
      `),
    })

    return NextResponse.json({
      success: true,
      message: 'Invitación creada. Comparte el enlace con el usuario.',
      data: {
        id: invitacion.id,
        email,
        rol,
        expiresAt,
        token: session.rol === 'superadmin' ? token : undefined,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[INVITACIONES POST ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al crear la invitación' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session || (session.rol !== 'superadmin' && session.rol !== 'empresario')) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  try {
    const invitaciones = await prisma.invitacion.findMany({
      where: { tenantId: session.tenantId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        email: true,
        rol: true,
        aceptada: true,
        expiresAt: true,
        createdAt: true,
      },
    })
    return NextResponse.json({ success: true, data: invitaciones })
  } catch (error) {
    console.error('[INVITACIONES GET ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
