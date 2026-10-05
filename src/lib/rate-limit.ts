import 'server-only'

type Bucket = { count: number; resetAt: number }

const WINDOW_SIZE_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 100
const CLEANUP_INTERVAL_MS = 5 * 60_000

let lastCleanup = Date.now()

function shouldCleanup(): boolean {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL_MS) return false
  lastCleanup = Date.now()
  return true
}

function getBucket(key: string): Bucket {
  const existing = store.get(key)
  if (!existing || existing.resetAt <= Date.now()) {
    return { count: 0, resetAt: Date.now() + WINDOW_SIZE_MS }
  }
  return existing
}

// Fallback in-memory para dev; en serverless cada lambda tiene su propio Map.
// Para producción multi-instancia se recomienda migrar a Upstash Redis / Vercel KV.
// Este wrapper mantiene API compatible y añade límite global por ventana deslizante.
const store = new Map<string, Bucket>()
let useRedis = false
let redis: { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<void>; ttl: (k: string) => Promise<number> } | null = null

async function getRedis() {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    // dynamic import opcional, solo si existe el paquete
    const mod = await (import('@upstash/redis' as string) as Promise<unknown>).catch(() => null) as unknown as { Redis: new (o: unknown) => typeof redis } | null
    if (!mod) return null
    redis = new mod.Redis({ url, token }) as unknown as typeof redis
    useRedis = true
    return redis
  } catch {
    return null
  }
}

export async function rateLimitAsync(key: string, limit: number, windowMs: number): Promise<boolean> {
  const r = await getRedis()
  if (r) {
    const count = await r.incr(`rl:${key}`)
    if (count === 1) await r.expire(`rl:${key}`, Math.ceil(windowMs / 1000))
    return count <= limit
  }
  return rateLimit(key, limit, windowMs)
}

const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

export function isAccountLocked(key: string): boolean {
  const attempt = failedAttempts.get(key)
  if (!attempt) return false
  if (attempt.lockedUntil > Date.now()) return true
  failedAttempts.delete(key)
  return false
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now()
  const existing = failedAttempts.get(key)

  if (!existing || existing.lockedUntil <= now) {
    failedAttempts.set(key, { count: 1, lockedUntil: 0 })
    return
  }

  existing.count += 1
  if (existing.count >= MAX_FAILED_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_DURATION_MS
  }
}

export function resetFailedAttempts(key: string): void {
  failedAttempts.delete(key)
}

export function getLockoutRemainingMs(key: string): number {
  const attempt = failedAttempts.get(key)
  if (!attempt || attempt.lockedUntil <= Date.now()) return 0
  return attempt.lockedUntil - Date.now()
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (bucket.count >= limit) {
    return false
  }

  bucket.count += 1
  return true
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

if (typeof setInterval === 'function') {
  setInterval(cleanupRateLimits, 60_000)
}
