import 'server-only'

const blacklist = new Set<string>()

const MAX_BLACKLIST_SIZE = 10000

export function blacklistToken(jti: string): void {
  if (blacklist.size >= MAX_BLACKLIST_SIZE) {
    const first = blacklist.values().next().value
    if (first) blacklist.delete(first)
  }
  blacklist.add(jti)
}

export function isTokenBlacklisted(jti: string): boolean {
  return blacklist.has(jti)
}

export function cleanupBlacklist(): void {
}
