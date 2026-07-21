import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { cedula, password } = await request.json()

    if (!cedula || !password) {
      return NextResponse.json({ success: false, message: 'Cédula y contraseña requeridas' }, { status: 400 })
    }

    const user = await prisma.usuario.findUnique({ where: { cedula } })
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
      },
    })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
