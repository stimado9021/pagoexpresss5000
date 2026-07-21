import 'server-only'
import { getSession } from './session'
import { prisma } from './prisma'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export const verifySession = cache(async () => {
  const session = await getSession()
  if (!session?.userId) {
    redirect('/login')
  }
  return session
})

export const getCurrentUser = cache(async () => {
  const session = await verifySession()
  const user = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { id: true, cedula: true, nombre: true, apellido: true, rol: true, email: true, telefono: true, activo: true },
  })
  return user
})
