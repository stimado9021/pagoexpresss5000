import 'server-only'
import { createHash } from 'crypto'

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co'

export type WompiConfig = {
  publicKey: string
  privateKey: string
  eventsKey: string
  integrityKey: string
  webhookSecret: string
  mode: 'sandbox' | 'production'
  apiUrl: string
}

export function getWompiConfig(): WompiConfig {
  return {
    publicKey: process.env.WOMPI_PUBLIC_KEY || '',
    privateKey: process.env.WOMPI_PRIVATE_KEY || '',
    eventsKey: process.env.WOMPI_EVENTS_KEY || '',
    integrityKey: process.env.WOMPI_INTEGRITY_KEY || '',
    webhookSecret: process.env.WOMPI_WEBHOOK_SECRET || '',
    mode: process.env.WOMPI_MODE === 'production' ? 'production' : 'sandbox',
    apiUrl: process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1',
  }
}

export function isWompiConfigured(): boolean {
  const cfg = getWompiConfig()
  const usable = (v: string) => v.length > 0 && !v.includes('REEMPLAZA')
  return usable(cfg.publicKey) && usable(cfg.privateKey)
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function createPaymentLink(params: {
  name: string
  description?: string
  amountInCents: number
  currency?: string
  reference: string
  redirectUrl?: string
}): Promise<{ id: string; url: string }> {
  const cfg = getWompiConfig()
  if (!cfg.privateKey || cfg.privateKey.includes('REEMPLAZA')) {
    throw new Error('WOMPI_PRIVATE_KEY no está configurada. Revisa el archivo .env')
  }

  const body: Record<string, unknown> = {
    name: params.name,
    description: params.description || params.name,
    single_use: true,
    collect_shipping: false,
    currency: params.currency || 'COP',
    amount_in_cents: params.amountInCents,
    reference: params.reference,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
  if (params.redirectUrl) body.redirect_url = params.redirectUrl

  const res = await fetch(`${cfg.apiUrl}/payment_links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.privateKey}`,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.message || json?.error?.message || json?.message?.error || `Error Wompi (${res.status})`
    throw new Error(msg)
  }

  const id: string | undefined = json?.data?.id
  if (!id) throw new Error('Wompi no devolvió el id del enlace de pago')

  return { id, url: `${WOMPI_CHECKOUT_URL}/l/${id}` }
}

function getByPath(obj: unknown, path: string): string | null {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return null
    }
  }
  if (cur === null || cur === undefined) return null
  return String(cur)
}

export function verifyEventSignature(event: {
  data?: unknown
  signature?: { properties?: string[]; checksum?: string }
  timestamp?: number
}): boolean {
  const cfg = getWompiConfig()
  if (!cfg.eventsKey || cfg.eventsKey.includes('REEMPLAZA')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[WOMPI WEBHOOK] WOMPI_EVENTS_KEY no está configurada. Rechazando evento.')
      return false
    }
    console.warn('[WOMPI WEBHOOK] Sin WOMPI_EVENTS_KEY, aceptando eventos sin validar firma (solo desarrollo)')
    return true
  }

  const props = event?.signature?.properties ?? []
  const checksum = event?.signature?.checksum
  if (!checksum || typeof event?.timestamp !== 'number' || props.length === 0) return false

  const toHash = props.map((p) => getByPath(event.data, p) ?? '').join('') + String(event.timestamp) + cfg.eventsKey
  const computed = createHash('sha256').update(toHash).digest('hex')
  return computed.toLowerCase() === checksum.toLowerCase()
}

export function parseReference(reference: string): { tenantId: number; planId: number; intervalo: 'MONTHLY' | 'ANUAL' } | null {
  const m = /^PE-(\d+)-(\d+)-(MONTHLY|ANUAL)-\d+$/.exec(reference || '')
  if (!m) return null
  return {
    tenantId: parseInt(m[1], 10),
    planId: parseInt(m[2], 10),
    intervalo: m[3] as 'MONTHLY' | 'ANUAL',
  }
}

export function buildReference(tenantId: number, planId: number, intervalo: 'MONTHLY' | 'ANUAL'): string {
  return `PE-${tenantId}-${planId}-${intervalo}-${Date.now()}`
}
