import 'server-only'

type Bucket = { count: number; resetAt: number }

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
