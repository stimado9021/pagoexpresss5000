import 'server-only'
import Stripe from 'stripe'

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY no está configurada. Revisa el archivo .env')
  }
  return new Stripe(key, { typescript: true })
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export function getStripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || ''
}
