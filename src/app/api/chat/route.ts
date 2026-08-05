import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBotResponse } from '@/lib/whatsapp-bot'
import { normalizePhone, sendWhatsAppText } from '@/lib/evolution-api'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

type ChatMessage = {
  id: number
  direccion: string
  texto: string
  createdAt: Date
}

async function getMensajes(sesionId: number): Promise<ChatMessage[]> {
  return prisma.chatMensaje.findMany({
    where: { sesionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, direccion: true, texto: true, createdAt: true },
  })
}

export async function GET(request: NextRequest) {
  const telefono = normalizePhone(request.nextUrl.searchParams.get('telefono') || '')
  if (!telefono) {
    return NextResponse.json({ success: false, message: 'Falta el teléfono' }, { status: 400 })
  }

  const sesion = await prisma.chatSesion.findUnique({ where: { telefono } })
  if (!sesion) return NextResponse.json({ success: true, mensajes: [] })

  const mensajes = await getMensajes(sesion.id)
  return NextResponse.json({ success: true, mensajes })
}

export async function POST(request: NextRequest) {
  if (!rateLimit(`chat:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { success: false, message: 'Demasiados mensajes. Intenta de nuevo en un momento.' },
      { status: 429 }
    )
  }

  let body: { telefono?: string; texto?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 })
  }

  const telefono = normalizePhone(body.telefono || '')
  const texto = (body.texto || '').trim().slice(0, 1000)
  if (!telefono || !texto) {
    return NextResponse.json({ success: false, message: 'Teléfono y texto requeridos' }, { status: 400 })
  }

  const now = new Date()
  const sesion = await prisma.chatSesion.upsert({
    where: { telefono },
    update: { updatedAt: now },
    create: { telefono },
  })

  const botResponse = getBotResponse(texto)

  await prisma.$transaction([
    prisma.chatMensaje.create({
      data: { sesionId: sesion.id, direccion: 'entrada', texto },
    }),
    prisma.chatMensaje.create({
      data: { sesionId: sesion.id, direccion: 'salida', texto: botResponse },
    }),
  ])

  await sendWhatsAppText(telefono, botResponse)

  const mensajes = await getMensajes(sesion.id)
  return NextResponse.json({ success: true, mensajes })
}
