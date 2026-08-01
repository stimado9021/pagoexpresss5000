import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      return NextResponse.json({ success: false, message: 'Demasiados intentos. Espera un minuto.' }, { status: 429 })
    }

    const { identificacion, password } = await request.json()

    if (!identificacion || !password) {
      return NextResponse.json({ success: false, message: 'Identificación y contraseña requeridas' }, { status: 400 })
    }

    const query = String(identificacion).trim()

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [{ cedula: query }, { email: query }],
      },
    })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!user.activo) {
      return NextResponse.json({ success: false, message: 'Usuario inactivo' }, { status: 403 })
    }

    await createSession({
      id: user.id,
      cedula: user.cedula,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      tenantId: user.tenantId,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        cedula: user.cedula,
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        email: user.email,
        tenantId: user.tenantId,
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
