import 'server-only'

export const BLOCKED_STATUSES = ['TRIAL_EXPIRED', 'SUSPENDED', 'CANCELLED'] as const
export type BlockedStatus = typeof BLOCKED_STATUSES[number]

export function isBlockedStatus(status: string | null | undefined): boolean {
  return (BLOCKED_STATUSES as readonly string[]).includes(status ?? '')
}

export const ALLOWED_BLOCKED_PATHS = [
  '/empresario/billing',
  '/api/subscriptions',
  '/api/auth',
  '/api/planes',
  '/api/webhooks',
  '/login',
  '/api/empresa/configuracion',
] as const

export function isAllowedWhenBlocked(pathname: string): boolean {
  return ALLOWED_BLOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`))
}
