import { NEGOCIO_TIMEZONE } from '@/lib/negocio'

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.TZ = NEGOCIO_TIMEZONE
  }
}
