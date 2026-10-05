export type SecurityEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'ACCESS_DENIED'
  | 'IDOR_ATTEMPT'
  | 'WEBHOOK_INVALID'
  | 'RATE_LIMIT_HIT'
  | 'SUSPICIOUS_ACTIVITY'

export async function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    ...details,
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(`[SECURITY] ${type}`, JSON.stringify(entry))
  } else {
    console.log(`[SECURITY] ${type}`, JSON.stringify(entry))
  }
}
