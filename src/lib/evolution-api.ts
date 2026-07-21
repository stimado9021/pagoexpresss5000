import 'server-only'

const API_URL = process.env.EVOLUTION_API_URL || 'https://evolutionapi2.globalpremiumhosting.com'
const INSTANCE = process.env.EVOLUTION_INSTANCE || 'ventaschicho'
const API_KEY = process.env.EVOLUTION_API_KEY || ''

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('57')) return cleaned
  if (cleaned.startsWith('0')) return `57${cleaned.slice(1)}`
  return `57${cleaned}`
}

export async function sendWhatsAppText(to: string, text: string): Promise<boolean> {
  if (!API_KEY || API_KEY === 'tu_api_key') return false

  try {
    const number = normalizePhone(to)
    const res = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
      body: JSON.stringify({ number, text, options: { delay: 1200, presence: 'composing' } }),
    })
    return res.ok
  } catch (err) {
    console.error('[WHATSAPP ERROR]', err)
    return false
  }
}

export function formatReceipt(data: {
  cliente: string
  monto: number
  fecha: Date
  cuotaDiaria: number
  saldoPendiente: number
  metodo?: string
}): string {
  const fecha = data.fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const money = (n: number) => `$${n.toLocaleString('es-CO')}`
  return [
    '┌─────────────────────────────┐',
    '│       PAGOEXPRESS           │',
    '│   Comprobante de Pago       │',
    '└─────────────────────────────┘',
    '',
    `Cliente: ${data.cliente}`,
    `Fecha:   ${fecha}`,
    '',
    `Monto pagado:     ${money(data.monto)}`,
    `Cuota diaria:     ${money(data.cuotaDiaria)}`,
    `Saldo pendiente:  ${money(data.saldoPendiente)}`,
    data.metodo ? `Método: ${data.metodo}` : '',
    '',
    '¡Gracias por tu pago!',
    '───────────────────────────────',
  ].filter(Boolean).join('\n')
}

export function formatNuevoPrestamo(data: {
  cliente: string
  montoSolicitado: number
  tasaInteres: number
  interesTotal: number
  montoTotal: number
  cuotaDiaria: number
  diasPlazo: number
  esConsolidacion?: boolean
  deudaPrevia?: number
}): string {
  const money = (n: number) => `$${n.toLocaleString('es-CO')}`
  const lines = [
    '┌─────────────────────────────┐',
    '│       PAGOEXPRESS           │',
    data.esConsolidacion ? '│   📋 Consolidación        │' : '│   ✅ Nuevo Préstamo       │',
    '└─────────────────────────────┘',
    '',
    `Hola ${data.cliente},`,
    '',
    `Monto solicitado:  ${money(data.montoSolicitado)}`,
    `Interés (${data.tasaInteres}%): ${money(data.interesTotal)}`,
    `Total a pagar:     ${money(data.montoTotal)}`,
    `Cuota diaria:      ${money(data.cuotaDiaria)}`,
    `Días de plazo:     ${data.diasPlazo}`,
  ]
  if (data.esConsolidacion && data.deudaPrevia) {
    lines.push(
      '',
      `▶ Suma total con deuda anterior: ${money(data.deudaPrevia + data.montoTotal)}`,
      `  (Deuda previa: ${money(data.deudaPrevia)} + Nuevo: ${money(data.montoTotal)})`,
    )
  }
  lines.push('', '¡Recuerda pagar a tiempo!', '───────────────────────────────')
  return lines.join('\n')
}

export function formatRecordatorio(data: {
  cliente: string
  diasAtraso: number
  cuotaDiaria: number
  saldoPendiente: number
}): string {
  const money = (n: number) => `$${n.toLocaleString('es-CO')}`
  const lines = [
    '┌─────────────────────────────┐',
    '│       PAGOEXPRESS           │',
    data.diasAtraso > 0 ? '│   ⚠ Recordatorio de Pago   │' : '│   📅 Aviso de Cuota        │',
    '└─────────────────────────────┘',
    '',
    `Hola ${data.cliente},`,
    '',
  ]
  if (data.diasAtraso > 0) {
    lines.push(
      `Tienes ${data.diasAtraso} día${data.diasAtraso !== 1 ? 's' : ''} de atraso.`,
      `Debes ponerte al día con ${money(data.cuotaDiaria * data.diasAtraso)}`,
      `Tu saldo pendiente es ${money(data.saldoPendiente)}`,
    )
  } else {
    lines.push(
      `Tu cuota de ${money(data.cuotaDiaria)} está próxima a vencer.`,
      `Por favor realiza tu pago a tiempo.`,
      `Saldo pendiente: ${money(data.saldoPendiente)}`,
    )
  }
  lines.push('', 'Contacta a tu asesor para más información.', '───────────────────────────────')
  return lines.join('\n')
}
