import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { hashPassword, verifyPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
    }

    const { passwordActual, nuevaPassword } = await request.json()

    if (!passwordActual || !nuevaPassword) {
      return NextResponse.json({ success: false, message: 'Todos los campos son obligatorios' }, { status: 400 })
    }
    if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 8) {
      return NextResponse.json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (nuevaPassword === passwordActual) {
      return NextResponse.json({ success: false, message: 'La nueva contraseña debe ser diferente a la actual' }, { status: 400 })
    }

    const user = await prisma.usuario.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 })
    }

    const valida = await verifyPassword(passwordActual, user.password)
    if (!valida) {
      return NextResponse.json({ success: false, message: 'La contraseña actual es incorrecta' }, { status: 400 })
    }

    const hashed = await hashPassword(nuevaPassword)
    await prisma.usuario.update({ where: { id: user.id }, data: { password: hashed } })

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}
