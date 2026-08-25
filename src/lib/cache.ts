import 'server-only'

type Entry<T> = { value: T; expiresAt: number }
const store = new Map<string, Entry<unknown>>()

export function getCached<T>(key: string): T | null {
  const e = store.get(key) as Entry<T> | undefined
  if (!e) return null
  if (Date.now() > e.expiresAt) {
    store.delete(key)
    return null
  }
  return e.value
}

export function setCached<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key)
  if (hit !== null) return Promise.resolve(hit)
  return fn().then((v) => {
    setCached(key, v, ttlMs)
    return v
  })
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k)
}

setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k)
}, 60_000)
