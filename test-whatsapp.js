const API_URL = 'https://evolutionapi2.globalpremiumhosting.com'
const INSTANCE = 'ventas_chicho_v2'
const API_KEY = 'P9a9tl9QrFJR/DaRWBCNJJFbLos5MErkBFGGtwoIOpjc6f1trAWWUBc5eUUB1IcjQCCrJG04n+iM/XWqh6yU0A=='
const PHONE = '573247716650'

function normalizePhone(phone) {
  const cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('57')) return cleaned
  if (cleaned.startsWith('0')) return `57${cleaned.slice(1)}`
  return `57${cleaned}`
}

const number = normalizePhone(PHONE)

const money = n => `$${n.toLocaleString('es-CO')}`

const comprobante = [
  '┌─────────────────────────────┐',
  '│       PAGOEXPRESS           │',
  '│   Comprobante de Pago       │',
  '└─────────────────────────────┘',
  '',
  'Cliente: sotanejo guzman',
  'Fecha:   17/07/2026, 07:55 p.m.',
  '',
  'Monto pagado:     $5.000',
  'Cuota diaria:     $5.000',
  'Saldo pendiente:  $115.000',
  '',
  '¡Gracias por tu pago!',
  '───────────────────────────────',
].join('\n')

const recordatorio = [
  '┌─────────────────────────────┐',
  '│       PAGOEXPRESS           │',
  '│   ⚠ Recordatorio de Pago   │',
  '└─────────────────────────────┘',
  '',
  'Hola sotanejo guzman,',
  '',
  'Tienes 3 días de atraso.',
  'Debes ponerte al día con $15.000',
  'Tu saldo pendiente es $120.000',
  '',
  'Contacta a tu asesor para más información.',
  '───────────────────────────────',
].join('\n')

async function send(type, text) {
  console.log(`\n📤 Enviando ${type} a ${number}...`)
  try {
    const res = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': API_KEY },
      body: JSON.stringify({ number, text, options: { delay: 1200, presence: 'composing' } }),
    })
    const data = await res.json()
    console.log(`✅ ${type} enviado:`, JSON.stringify(data, null, 2))
    return true
  } catch (err) {
    console.error(`❌ ${type} falló:`, err.message)
    return false
  }
}

;(async () => {
  console.log('=== TEST WHATSAPP EVOLUTION API ===\n')
  console.log('📱 Destino:', number)
  console.log('🔌 URL:', API_URL)
  console.log('🔑 Key:', API_KEY.slice(0, 10) + '...')

  await send('COMPROBANTE', comprobante)
  await send('RECORDATORIO', recordatorio)

  console.log('\n=== FIN DEL TEST ===')
})()
