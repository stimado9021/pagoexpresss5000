'use client'

import { useState } from 'react'
import { KeyRound, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function CambiarPassword({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function cerrar() {
    setOpen(false)
    setPasswordActual('')
    setNuevaPassword('')
    setConfirmar('')
    setError('')
    setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (nuevaPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (nuevaPassword !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordActual, nuevaPassword }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(data.message || 'Contraseña actualizada correctamente')
        setPasswordActual('')
        setNuevaPassword('')
        setConfirmar('')
      } else {
        setError(data.message || 'No se pudo cambiar la contraseña')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={`flex items-center gap-1.5 rounded-lg border border-bone/10 px-2.5 py-1.5 text-xs text-bone/60 hover:bg-emerald-950 transition-colors sm:px-3 sm:text-sm ${className || ''}`}>
        <KeyRound size={14} /> Cambiar contraseña
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={cerrar}>
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100 font-display">
                <KeyRound size={16} className="text-lime" /> Cambiar contraseña
              </h2>
              <button onClick={cerrar} className="text-zinc-500 hover:text-zinc-200" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {success && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {success}
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Contraseña actual</label>
                <input
                  type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                  placeholder="••••••••" required autoComplete="current-password"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Nueva contraseña</label>
                <input
                  type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                  placeholder="Mínimo 8 caracteres" required autoComplete="new-password"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Confirmar nueva contraseña</label>
                <input
                  type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all"
                  placeholder="Repite la nueva contraseña" required autoComplete="new-password"
                />
              </div>

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
