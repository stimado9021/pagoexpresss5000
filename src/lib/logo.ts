export const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const MAX_LOGO_BYTES = 200 * 1024

export function isValidLogoType(type: string): boolean {
  return ALLOWED_LOGO_TYPES.includes(type as (typeof ALLOWED_LOGO_TYPES)[number])
}

export function toLogoDataUrl(type: string, buffer: Buffer): string | null {
  if (!isValidLogoType(type)) return null
  return `data:${type};base64,${buffer.toString('base64')}`
}

export function isValidLogoDataUrl(dataUrl: string | null | undefined): dataUrl is string {
  if (!dataUrl || typeof dataUrl !== 'string') return false
  const match = /^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/.exec(dataUrl)
  if (!match) return false
  const maxPayloadLength = Math.ceil((MAX_LOGO_BYTES * 4) / 3)
  return match[2].length <= maxPayloadLength
}
