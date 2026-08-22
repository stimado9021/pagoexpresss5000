import { NextRequest, NextResponse } from 'next/server'
import { parseInboundEvent, sendWhatsAppReply } from '@/lib/evolution-api'
import { getBotResponse } from '@/lib/whatsapp-bot'
import { prisma } from '@/lib/prisma'

const WEBHOOK_TOKEN = process.env.EVOLUTION_WEBHOOK_TOKEN || ''

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!WEBHOOK_TOKEN || token !== WEBHOOK_TOKEN) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'JSON inválido' }, { status: 400 })
  }

  const msg = parseInboundEvent(payload)
  if (!msg || msg.event !== 'messages.upsert') {
    return NextResponse.json({ success: true, ignored: true })
  }

  if (msg.fromMe || !msg.text) {
    return NextResponse.json({ success: true, ignored: true })
  }

  const response = getBotResponse(msg.text)
  if (response) {
    sendWhatsAppReply(msg.from, response, msg.messageId).catch(() => {})
  }

  const sesion = await prisma.chatSesion.findUnique({ where: { telefono: msg.from } })
  if (sesion) {
    await prisma.$transaction(async (tx) => {
      await tx.chatMensaje.create({
        data: { sesionId: sesion.id, direccion: 'entrada', texto: msg.text ?? '' },
      })
      await tx.chatMensaje.create({
        data: { sesionId: sesion.id, direccion: 'salida', texto: response },
      })
      await tx.chatSesion.update({ where: { id: sesion.id }, data: { updatedAt: new Date() } })
    })
  }

  return NextResponse.json({ success: true, received: true })
}
