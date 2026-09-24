import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

Sentry.init({
  dsn,
  // Sin DSN el SDK queda deshabilitado (no falla ni envía nada).
  tracesSampleRate: 0.1,
})
