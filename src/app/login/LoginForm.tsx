'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, User } from 'lucide-react'
import type { TenantBranding } from './page'

type Space = { slug: string; nombre: string; url: string }

function currentSubdomain(): string {
  if (typeof window === 'undefined') return ''
  const parts = window.location.hostname.toLowerCase().split('.')
  // empresa.midominio.com / empresa.localhost → primer label (no www)
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0] === 'localhost' ? '' : parts[0]
  return ''
}

export default function LoginForm({ branding }: { branding: TenantBranding }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [otherSpace, setOtherSpace] = useState<Space | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function goTo(destino: string, tenantUrl?: string) {
    // Navegación cross-subdominio con recarga completa (la cookie es compartida).
    if (tenantUrl) {
      try {
        if (new URL(tenantUrl).host !== window.location.host) {
          window.location.href = `${tenantUrl}${destino}`
          return
        }
      } catch {
        /* sigue con router local */
      }
    }
    router.push(destino)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSpaces([])
    setOtherSpace(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim(), password, subdomain: currentSubdomain() || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        const routes: Record<string, string> = {
          superadmin: '/admin',
          empresario: '/empresario',
          vendedor: '/vendedor',
          cliente: '/cliente',
        }
        const destino = routes[data.user.rol]
        if (destino) goTo(destino, data.tenant?.url)
        else setError('Rol de usuario no reconocido')
      } else if (data.needTenant && Array.isArray(data.spaces)) {
        setSpaces(data.spaces)
        setError(data.message || 'Elige tu espacio de trabajo')
      } else if (data.otroEspacio?.url) {
        setOtherSpace({ slug: data.otroEspacio.slug, nombre: data.otroEspacio.slug, url: data.otroEspacio.url })
        setError(data.message || 'Esta cuenta pertenece a otro espacio de trabajo')
      } else {
        setError(data.message || 'Credenciales incorrectas')
      }
    } catch {
      setError('Error de conexión. Verifica el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-lime/20 overflow-hidden">
            {branding?.logoUrl
              ? <img src={branding.logoUrl} alt={branding.nombre} className="h-10 w-10 object-contain" />
              : <img src="/logo.webp" alt="Kreditools" className="h-10 w-10 object-contain" />}
          </span>
          <h1 className="text-xl font-bold text-zinc-100 font-display">{branding?.nombre ?? 'Kreditools'}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {branding ? `Espacio de trabajo · ${branding.slug}` : 'Cobros rápidos y seguros'}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400 uppercase tracking-wide text-xs">Correo electrónico</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800 py-3 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                  placeholder="tu@correo.com" required autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400 uppercase tracking-wide text-xs">Contraseña</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                placeholder="••••••••" required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
            )}

            {spaces.length > 0 && (
              <div className="space-y-2">
                {spaces.map((s) => (
                  <a
                    key={s.slug}
                    href={`${s.url}/login`}
                    className="block rounded-lg border border-lime-500/40 bg-lime-500/10 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-lime-500/20 text-center"
                  >
                    Ir a {s.nombre} →
                  </a>
                ))}
              </div>
            )}

            {otherSpace && (
              <a
                href={`${otherSpace.url}/login`}
                className="block rounded-lg border border-lime-500/40 bg-lime-500/10 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-lime-500/20 text-center"
              >
                Ir a mi espacio →
              </a>
            )}

            <button type="submit" disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm">
              {loading ? 'Ingresando...' : <>Ingresar <LogIn size={15} /></>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          &copy; 2026 Kreditools &bull; Gestión de Préstamos
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="text-lime hover:underline font-medium">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
