'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Building2, Users, CreditCard, Settings, LogOut,
  Eye, Ban, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  Mail, User, Phone, Shield, Wallet,
} from 'lucide-react'
import { InfoTip } from '@/components/Tooltip'

type DetalleTenant = {
  id: number
  nombre: string
  slug: string
  subdominio: string
  logoUrl: string | null
  status: string
  plan: { nombre: string; precioMensual: number; precioAnual: number | null } | null
  configuracion: { nombreEmpresa: string | null; tasaInteres: number; cuotaDiariaMin: number } | null
  trialStartsAt: string | null
  trialEndsAt: string | null
  planStartsAt: string | null
  planExpiresAt: string | null
  createdAt: string
  totalUsuarios: number
  totalPrestamos: number
  totalPagos: number
  totalInvitaciones: number
  montoColocado: number
  montoTotalCartera: number
  usuarios: {
    id: number
    cedula: string
    nombre: string
    apellido: string
    email: string | null
    rol: string
    activo: number
    createdAt: string
  }[]
}

const statusColors: Record<string, string> = {
  TRIAL: 'bg-lime/15 text-lime',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  TRIAL_EXPIRED: 'bg-amber-500/15 text-amber-400',
  SUSPENDED: 'bg-red-500/15 text-red-400',
  CANCELLED: 'bg-gray-500/15 text-gray-400',
}

const rolLabel: Record<string, string> = {
  superadmin: 'Super Admin',
  empresario: 'Empresario',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string | null): string => (d ? new Date(d).toLocaleDateString('es-CO') : '—')

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id
  const [tenant, setTenant] = useState<DetalleTenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/admin/tenants/${id}`)
      .then(res => {
        if (cancelled) return
        if (res.status === 401 || res.status === 403) { router.push('/login'); return }
        if (res.status === 404) { setError('Empresa no encontrada'); setLoading(false); return }
        return res.json()
      })
      .then(data => {
        if (cancelled || !data) return
        if (data.success) setTenant(data.data)
        else setError(data.message || 'Error al cargar')
      })
      .catch(() => { if (!cancelled) setError('Error de conexión') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-bone/10 border-t-lime" />
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 text-bone gap-3">
        <p className="text-red-400">{error || 'No se encontró la empresa'}</p>
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-lime hover:underline">
          <ArrowLeft size={16} /> Volver al panel
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-emerald-950 text-bone font-body p-6">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.push('/admin')} className="flex items-center gap-2 text-bone/60 hover:text-lime transition-colors mb-6">
          <ArrowLeft size={16} /> Volver al panel
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-lime/10 text-lime font-semibold text-2xl">
              {tenant.nombre.charAt(0)}
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-bold text-2xl">{tenant.nombre}</h1>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[tenant.status] || ''}`}>{tenant.status}</span>
              </div>
              <p className="text-sm text-bone/60 font-mono mt-1">{tenant.slug} • {tenant.subdominio}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/empresario')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bone/10 text-bone/60 hover:bg-emerald-950 transition-colors">
              <Eye size={16} /> Dashboard Empresa
            </button>
            <button onClick={() => { router.push('/login'); localStorage.removeItem('session') }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Plan', value: tenant.plan?.nombre ?? 'Sin plan', icon: <CreditCard size={18} /> },
            { label: 'Usuarios', value: tenant.totalUsuarios, icon: <Users size={18} /> },
            { label: 'Préstamos', value: tenant.totalPrestamos, icon: <Wallet size={18} /> },
            { label: 'Pagos', value: tenant.totalPagos, icon: <CreditCard size={18} /> },
            { label: 'Monto Colocado', value: fmtMoney(tenant.montoColocado), icon: <Wallet size={18} />, small: true },
            { label: 'Cartera Total', value: fmtMoney(tenant.montoTotalCartera), icon: <Wallet size={18} />, small: true },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-bone/60 text-sm mb-2">{stat.icon} {stat.label}</div>
              <p className={`font-bold ${(stat as { small?: boolean }).small ? 'text-lg' : 'text-2xl'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-5 col-span-3 lg:col-span-1">
            <h2 className="flex items-center gap-2 font-display font-semibold text-lg mb-4"><Settings size={18} /> Configuración</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-bone/60">Nombre de empresa</dt><dd>{tenant.configuracion?.nombreEmpresa || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-bone/60">Tasa de interés</dt><dd>{tenant.configuracion ? `${tenant.configuracion.tasaInteres}%` : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-bone/60">Cuota diaria mín</dt><dd>{tenant.configuracion ? fmtMoney(tenant.configuracion.cuotaDiariaMin) : '—'}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-5 col-span-3 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold mb-4"><Users size={18} /> Usuarios <span className="text-bone/40 text-xs">({tenant.usuarios.length})</span></h2>
            {tenant.usuarios.length === 0 ? (
              <p className="text-sm text-bone/40">Sin usuarios registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bone/10 text-left text-bone/60 text-xs uppercase">
                      <th className="py-2 pr-4">Usuario</th>
                      <th className="py-2 pr-4">Cédula</th>
                      <th className="py-2 pr-4">Rol</th>
                      <th className="py-2 pr-4">Estado</th>
                      <th className="py-2">Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bone/10">
                    {tenant.usuarios.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="h-7 w-7 rounded-full bg-lime/10 flex items-center justify-center text-lime text-xs font-semibold">{u.nombre.charAt(0)}</span>
                            <div>
                              <p className="font-medium">{u.nombre} {u.apellido}</p>
                              <p className="text-xs text-bone/50">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-bone/80">{u.cedula}</td>
                        <td className="py-2.5 pr-4">{rolLabel[u.rol] || u.rol}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] ${u.activo ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-2.5 text-bone/60">{fmtDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-bone/10 bg-graphite-900 p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold mb-4"><Clock size={18} /> Fechas clave</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><dt className="text-bone/60">Registrado</dt><dd>{fmtDate(tenant.createdAt)}</dd></div>
            <div><dt className="text-bone/60">Inicio de trial</dt><dd>{fmtDate(tenant.trialStartsAt)}</dd></div>
            <div><dt className="text-bone/60">Fin de trial</dt><dd>{fmtDate(tenant.trialEndsAt)}</dd></div>
            <div><dt className="text-bone/60">Inicio de plan</dt><dd>{fmtDate(tenant.planStartsAt)}</dd></div>
            <div><dt className="text-bone/60">Expiración de plan</dt><dd>{fmtDate(tenant.planExpiresAt)}</dd></div>
          </div>
        </div>
      </div>
    </div>
  )
}