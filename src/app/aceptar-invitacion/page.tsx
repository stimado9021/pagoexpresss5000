'use client'

import { Suspense, useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User } from 'lucide-react'

function AcceptForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/invitaciones/aceptar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        const destino = data.user?.rol === 'vendedor' ? '/vendedor' : data.user?.rol === 'cliente' ? '/cliente' : '/login'
        router.push(destino)
      } else {
        setError(data.message || 'Error al aceptar la invitaciÃ³n')
      }
    } catch {
      setError('Error de conexiÃ³n. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
        Enlace de invitaciÃ³n invÃ¡lido. Solicita un nuevo enlace.
      </div>
    )
  }

  const inputCls = "w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">Nombre</label>
            <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Nombre" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">Apellido</label>
            <input type="text" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} className={inputCls} placeholder="Apellido" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">CÃ©dula</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input type="text" required value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} className={`${inputCls} pl-9`} placeholder="NÃºmero de identificaciÃ³n" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">ContraseÃ±a</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="MÃ­nimo 8 caracteres" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 uppercase tracking-wide">Confirmar</label>
            <input type="password" required value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={inputCls} placeholder="Repite la contraseÃ±a" />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-sm text-red-400">{error}</div>
        )}

        <button type="submit" disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 font-display hover:bg-zinc-200 disabled:opacity-50 transition-colors shadow-sm">
          {loading ? 'Activando cuenta...' : 'Aceptar invitaciÃ³n'}
        </button>
      </form>
    </div>
  )
}

export default function AceptarInvitacionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg shadow-lime/20"><img src="/logo.webp" alt="PagoExpress" className="h-10 w-10 object-contain" /></span>
          <h1 className="text-xl font-bold text-zinc-100 font-display">PagoExpress</h1>
          <p className="mt-1 text-sm text-zinc-400">Completa tus datos para unirte</p>
        </div>
        <Suspense fallback={<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">Cargando...</div>}>
          <AcceptForm />
        </Suspense>
      </div>
    </div>
  )
}
