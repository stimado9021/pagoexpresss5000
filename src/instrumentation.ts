import { NEGOCIO_TIMEZONE } from '@/lib/negocio'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.TZ = NEGOCIO_TIMEZONE
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}
