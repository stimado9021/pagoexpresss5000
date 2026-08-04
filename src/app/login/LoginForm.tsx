'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, User } from 'lucide-react'

export default function LoginForm() {
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificacion: cedula.trim(), password }),
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
        if (destino) router.push(destino)
        else setError('Rol de usuario no reconocido')
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
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-lime/20"><img src="/logo.png" alt="PagoExpress" className="h-10 w-10 object-contain" /></span>
          <h1 className="text-xl font-bold text-zinc-100 font-display">PagoExpress</h1>
          <p className="mt-1 text-sm text-zinc-400">Cobros rápidos y seguros</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400 uppercase tracking-wide text-xs">Cédula o correo</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text" value={cedula} onChange={(e) => setCedula(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800 py-3 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                  placeholder="Identificación o correo" required
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

            <button type="submit" disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm">
              {loading ? 'Ingresando...' : <>Ingresar <LogIn size={15} /></>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          &copy; 2026 PagoExpress &bull; Gestión de Préstamos
        </p>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="text-lime hover:underline font-medium">← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
