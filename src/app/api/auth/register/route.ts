import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmail, layoutHtml, appUrl } from '@/lib/mail'
import { isValidLogoDataUrl } from '@/lib/logo'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`register:${ip}`, 5, 60_000)) {
      return NextResponse.json({ success: false, message: 'Demasiados intentos. Espera un minuto.' }, { status: 429 })
    }

    const body = await request.json()
    const {
      empresa,
      adminNombre,
      adminApellido,
      correo,
      telefono,
      subdominio,
      password,
      confirmPassword,
      logo,
    } = body

    if (!empresa || !adminNombre || !correo || !subdominio || !password) {
      return NextResponse.json({
        success: false,
        message: 'Todos los campos son obligatorios',
      }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({
        success: false,
        message: 'Las contraseñas no coinciden',
      }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: 'La contraseña debe tener al menos 8 caracteres',
      }, { status: 400 })
    }

    if (logo && !isValidLogoDataUrl(logo)) {
      return NextResponse.json({
        success: false,
        message: 'Logo inválido (usa PNG, JPG o WebP de máximo 200 KB)',
      }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(correo)) {
      return NextResponse.json({ success: false, message: 'Correo electrónico inválido' }, { status: 400 })
    }

    const slug = subdominio
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    if (slug.length < 3) {
      return NextResponse.json({ success: false, message: 'Subdominio inválido' }, { status: 400 })
    }
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json({
        success: false,
        message: 'Este subdominio ya está en uso',
      }, { status: 409 })
    }

    const existingEmail = await prisma.usuario.findFirst({ where: { email: correo } })
    if (existingEmail) {
      return NextResponse.json({
        success: false,
        message: 'Ya existe una cuenta con este correo',
      }, { status: 409 })
    }

    const plan = await prisma.plan.findFirst({ where: { slug: 'independiente', activo: true } })
    if (!plan) {
      return NextResponse.json({
        success: false,
        message: 'No se pudo encontrar el plan por defecto',
      }, { status: 500 })
    }

    const now = new Date()
    const trialEnd = new Date(now.getTime() + (plan.trialDays || 14) * 24 * 60 * 60 * 1000)

    const tenant = await prisma.tenant.create({
      data: {
        nombre: empresa,
        slug,
        subdominio: `${slug}.pagoexpress.com`,
        planId: plan.id,
        status: 'TRIAL',
        trialStartsAt: now,
        trialEndsAt: trialEnd,
      },
    })

    await prisma.configuracionTenant.create({
      data: {
        tenantId: tenant.id,
        nombreEmpresa: empresa,
        ...(isValidLogoDataUrl(logo) ? { logoUrl: logo } : {}),
      },
    })

    await prisma.suscripcion.create({
      data: {
        tenantId: tenant.id,
        planId: plan.id,
        estado: 'ACTIVE',
        pagadoHasta: trialEnd,
      },
    })

    const hashedPassword = await hashPassword(password)

    const usuario = await prisma.usuario.create({
      data: {
        cedula: slug,
        nombre: adminNombre,
        apellido: adminApellido || '',
        email: correo,
        telefono: telefono || null,
        rol: 'empresario',
        activo: 1,
        password: hashedPassword,
        tenantId: tenant.id,
      },
    })

    await createSession({
      id: usuario.id,
      cedula: usuario.cedula,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      tenantId: usuario.tenantId,
    })

    await sendEmail({
      to: correo,
      subject: 'Tu espacio en PagoExpress está listo',
      html: layoutHtml(`
        <h1 style="font-size:20px;margin:0 0 12px;">¡Bienvenido, ${adminNombre}!</h1>
        <p style="margin:0 0 16px;">Tu empresa <strong>${empresa}</strong> ya está creada con 14 días de prueba gratis.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
          <tr>
            <td style="padding:8px 0;color:#a8a29e;">Subdominio</td>
            <td style="padding:8px 0;text-align:right;font-family:monospace;">${slug}.pagoexpress.com</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#a8a29e;">Correo de acceso</td>
            <td style="padding:8px 0;text-align:right;">${correo}</td>
          </tr>
        </table>
        <a href="${appUrl}/login" style="display:inline-block;background:#c9f24c;color:#022c22;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">
          Ir a mi panel
        </a>
        <p style="margin:20px 0 0;color:#a8a29e;font-size:12px;">Puedes ingresar desde el panel de tu empresa cuando quieras. No es necesario pagar durante el periodo de prueba.</p>
      `),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: usuario.id,
        cedula: usuario.cedula,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        rol: usuario.rol,
        tenantId: tenant.id,
      },
      tenant: {
        id: tenant.id,
        nombre: tenant.nombre,
        slug: tenant.slug,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({
      success: false,
      message: 'Error al registrar la empresa',
    }, { status: 500 })
  }
}