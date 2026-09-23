'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Lock, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function RestablecerPage() {
  const [token] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('token')
  )
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginUrl, setLoginUrl] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (nueva !== confirmar) {
      setMsg({ ok: false, text: 'Las contraseñas no coinciden' })
      return
    }
    if (nueva.length < 8) {
      setMsg({ ok: false, text: 'La contraseña debe tener al menos 8 caracteres' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword: nueva }),
      })
      const data = await res.json()
      if (data.success) {
        setLoginUrl(data.loginUrl || '/login')
        setMsg({ ok: true, text: data.message })
      } else {
        setMsg({ ok: false, text: data.message || 'No se pudo restablecer' })
      }
    } catch {
      setMsg({ ok: false, text: 'Error de conexión. Verifica el servidor.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-lime/20 overflow-hidden">
            <img src="/logo.webp" alt="Kreditools" className="h-10 w-10 object-contain" />
          </span>
          <h1 className="text-xl font-bold text-zinc-100 font-display">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-zinc-400">Elige una clave de al menos 8 caracteres</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          {token === null ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-lime-500" />
            </div>
          ) : !token ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-red-400">Enlace inválido. Solicita uno nuevo desde el login.</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-lime hover:underline">
                <ArrowLeft size={14} /> Volver al login
              </Link>
            </div>
          ) : loginUrl && msg?.ok ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
              <p className="text-sm text-zinc-300">{msg.text}</p>
              <a href={loginUrl} className="inline-block rounded-lg bg-lime-500 px-6 py-2.5 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 transition-colors">
                Ir al login
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Nueva contraseña</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password" value={nueva} onChange={(e) => setNueva(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-800 py-3 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                    placeholder="••••••••" required minLength={8} autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-800 py-3 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                    placeholder="••••••••" required minLength={8} autoComplete="new-password"
                  />
                </div>
              </div>

              {msg && (
                <div className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/15 text-red-400'}`}>{msg.text}</div>
              )}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm">
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">&copy; 2026 Kreditools &bull; Gestión de Préstamos</p>
      </div>
    </div>
  )
}
