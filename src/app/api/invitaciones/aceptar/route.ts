import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  try {
    const { token, nombre, apellido, cedula, password, confirmPassword } = await request.json()
    if (!token || !nombre || !cedula || !password) {
      return NextResponse.json({ success: false, message: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ success: false, message: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const invitacion = await prisma.invitacion.findUnique({ where: { token } })
    if (!invitacion) {
      return NextResponse.json({ success: false, message: 'Invitación no encontrada' }, { status: 404 })
    }

    if (invitacion.aceptada) {
      return NextResponse.json({ success: false, message: 'Esta invitación ya fue utilizada' }, { status: 400 })
    }

    if (invitacion.expiresAt < new Date()) {
      return NextResponse.json({ success: false, message: 'Esta invitación ha expirado' }, { status: 400 })
    }

    const existing = await prisma.usuario.findFirst({
      where: { OR: [{ cedula }, { email: invitacion.email }] },
    })
    if (existing) {
      return NextResponse.json({ success: false, message: 'La cédula o el correo ya están registrados' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)
    const usuario = await prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          cedula,
          nombre,
          apellido: apellido || '',
          email: invitacion.email,
          rol: invitacion.rol,
          password: hashedPassword,
          activo: 1,
          tenantId: invitacion.tenantId,
        },
      })
      await tx.invitacion.update({
        where: { id: invitacion.id },
        data: { aceptada: true },
      })
      return user
    })

    await createSession({
      id: usuario.id,
      cedula: usuario.cedula,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      tenantId: usuario.tenantId,
    })

    return NextResponse.json({
      success: true,
      message: 'Cuenta activada correctamente',
      user: { rol: usuario.rol, tenantId: usuario.tenantId },
    }, { status: 201 })
  } catch (error) {
    console.error('[INVITACIONES ACEPTAR ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
