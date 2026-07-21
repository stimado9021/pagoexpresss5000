'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, CreditCard, User } from 'lucide-react'

export default function LoginPage() {
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
        body: JSON.stringify({ cedula, password }),
      })
      const data = await res.json()

      if (data.success) {
        const routes: Record<string, string> = {
          superadmin: '/admin',
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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B5FEF] shadow-lg shadow-[#5B5FEF]/20">
            <CreditCard size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#111827]">PagoExpress</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Cobros rápidos y seguros</p>
        </div>

        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#111827]">Cédula / DNI</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="text" value={cedula} onChange={(e) => setCedula(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] transition-all"
                  placeholder="Identificación" required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#111827]">Contraseña</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] transition-all"
                placeholder="••••••••" required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-[#FEF2F2] p-3 text-sm text-[#EF4444]">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] disabled:opacity-50 transition-all shadow-sm">
              {loading ? 'Ingresando...' : <>Ingresar <LogIn size={15} /></>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B7280]">
          &copy; 2026 PagoExpress &bull; Gestión de Préstamos
        </p>
      </div>
    </div>
  )
}
