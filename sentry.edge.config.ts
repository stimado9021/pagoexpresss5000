import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined

Sentry.init({
  dsn,
  tracesSampleRate: 0.1,
})
