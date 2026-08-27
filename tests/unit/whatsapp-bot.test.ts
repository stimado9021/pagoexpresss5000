import { describe, it, expect } from 'vitest'
import { getBotResponse } from '@/lib/whatsapp-bot'
import { parseInboundEvent } from '@/lib/evolution-api'

describe('getBotResponse', () => {
  it('responde con el menú a un saludo', () => {
    const r = getBotResponse('hola')
    expect(r).toContain('Planes y precios')
    expect(r).toContain('Cómo crear tu empresa')
  })

  it('responde a la opción numérica 1 con los planes', () => {
    const r = getBotResponse('1')
    expect(r).toContain('Independiente')
    expect(r).toContain('US$99/mes')
    expect(r).toContain('15 días de prueba')
  })

  it('responde a una pregunta de precios con los planes', () => {
    const r = getBotResponse('¿cuánto cuesta el plan empresarial?')
    expect(r).toContain('Empresarial')
    expect(r).toContain('US$249/mes')
  })

  it('responde a cómo pagar el plan', () => {
    const r = getBotResponse('¿cómo pago mi plan?')
    expect(r).toContain('Suscripción')
    expect(r).toContain('Wompi')
  })

  it('responde a cómo funcionan los préstamos', () => {
    const r = getBotResponse('cómo son los préstamos')
    expect(r).toContain('tasa de interés')
    expect(r).toContain('cuota diaria')
  })

  it('responde a cómo crear vendedores', () => {
    const r = getBotResponse('cómo crear vendedores')
    expect(r).toContain('Crear nuevo vendedor')
  })

  it('responde a cómo crear clientes', () => {
    const r = getBotResponse('como creo clientes')
    expect(r).toContain('Nuevo cliente')
  })

  it('responde a cómo crear la empresa', () => {
    const r = getBotResponse('como creo mi empresa')
    expect(r).toContain('subdominio')
    expect(r).toContain('15 días de prueba')
  })

  it('responde a la prueba gratis', () => {
    const r = getBotResponse('tiene prueba gratis?')
    expect(r).toContain('15 días de prueba')
  })

  it('responde con la introducción a "qué es kredipay"', () => {
    const r = getBotResponse('qué es kredipay?')
    expect(r).toContain('Kredipay es una plataforma')
  })

  it('devuelve el fallback con menú para entradas desconocidas', () => {
    const r = getBotResponse('asdfghjklñ')
    expect(r).toContain('No estoy seguro')
    expect(r).toContain('Planes y precios')
  })
})

describe('parseInboundEvent', () => {
  it('extrae el mensaje entrante de texto plano', () => {
    const msg = parseInboundEvent({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '573001234567@s.whatsapp.net', fromMe: false, id: 'ABC123' },
        pushName: 'Juan',
        message: { conversation: 'hola' },
      },
    })
    expect(msg).toEqual({
      event: 'messages.upsert',
      from: '573001234567',
      fromMe: false,
      text: 'hola',
      messageId: 'ABC123',
      pushName: 'Juan',
    })
  })

  it('extrae el texto de extendedTextMessage', () => {
    const msg = parseInboundEvent({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '573001234567@s.whatsapp.net', fromMe: false, id: 'X' },
        message: { extendedTextMessage: { text: 'cuánto vale el plan' } },
      },
    })
    expect(msg?.text).toBe('cuánto vale el plan')
  })

  it('marca fromMe cuando el mensaje salió de la propia instancia', () => {
    const msg = parseInboundEvent({
      event: 'messages.upsert',
      data: {
        key: { remoteJid: '573001234567@s.whatsapp.net', fromMe: true, id: 'X' },
        message: { conversation: 'comprobante' },
      },
    })
    expect(msg?.fromMe).toBe(true)
  })

  it('devuelve null si no hay remoteJid', () => {
    expect(parseInboundEvent({ event: 'messages.upsert', data: {} })).toBeNull()
    expect(parseInboundEvent(null)).toBeNull()
  })
})
