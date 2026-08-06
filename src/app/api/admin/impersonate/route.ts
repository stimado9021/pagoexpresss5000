import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession, createSession } from '@/lib/session'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { tenantId, userId } = body

    if (!tenantId) {
      return NextResponse.json({ success: false, message: 'tenantId requerido' }, { status: 400 })
    }

    const targetUser = userId
      ? await prisma.usuario.findFirst({
          where: { id: userId, tenantId },
          select: { id: true, cedula: true, nombre: true, apellido: true, rol: true, tenantId: true },
        })
      : await prisma.usuario.findFirst({
          where: { tenantId, rol: 'empresario' },
          select: { id: true, cedula: true, nombre: true, apellido: true, rol: true, tenantId: true },
        })

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 })
    }

    await prisma.historial.create({
      data: {
        usuarioId: session.userId,
        tenantId: tenantId,
        accion: 'IMPERSONATE',
        tablaAfectada: 'tenants',
        registroId: tenantId,
        detalles: JSON.stringify({
          adminId: session.userId,
          targetUserId: targetUser.id,
          targetTenantId: tenantId,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
      },
    })

    await createSession({
      id: targetUser.id,
      cedula: targetUser.cedula,
      rol: targetUser.rol,
      nombre: targetUser.nombre,
      apellido: targetUser.apellido,
      tenantId: targetUser.tenantId,
    })

    return NextResponse.json({ success: true, message: 'Impersonación activada', data: { userId: targetUser.id, rol: targetUser.rol, tenantId: targetUser.tenantId } })
  } catch (error) {
    console.error('[IMPERSONATE ERROR]', error)
    return NextResponse.json({ success: false, message: 'Error al iniciar impersonación' }, { status: 500 })
  }
}