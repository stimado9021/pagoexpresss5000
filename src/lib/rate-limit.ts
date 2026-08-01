import 'server-only'

type Bucket = { count: number; resetAt: number }

const store = new Map<string, Bucket>()

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
