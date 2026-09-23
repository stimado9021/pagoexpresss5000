'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function RecuperarPage() {
  const [correo, setCorreo] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setEnviado(true)
        setMsg({ ok: true, text: data.message })
      } else {
        setMsg({ ok: false, text: data.message || 'Error al procesar la solicitud' })
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
          <h1 className="text-xl font-bold text-zinc-100 font-display">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-zinc-400">Te enviamos un enlace a tu correo</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
          {enviado && msg?.ok ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
              <p className="text-sm text-zinc-300">{msg.text}</p>
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-lime hover:underline">
                <ArrowLeft size={14} /> Volver al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Correo electrónico</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-800 py-3 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
                    placeholder="tu@correo.com" required autoComplete="email"
                  />
                </div>
              </div>

              {msg && (
                <div className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/15 text-red-400'}`}>{msg.text}</div>
              )}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm">
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <p className="text-center text-sm text-zinc-500">
                <Link href="/login" className="inline-flex items-center gap-1 text-lime hover:underline font-medium"><ArrowLeft size={13} /> Volver al login</Link>
              </p>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">&copy; 2026 Kreditools &bull; Gestión de Préstamos</p>
      </div>
    </div>
  )
}
