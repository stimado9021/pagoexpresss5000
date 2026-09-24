'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, LogOut,
  Search, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Ban, RefreshCw, Eye, DollarSign, Wallet, Percent,
} from 'lucide-react'
import CambiarPassword from '@/components/CambiarPassword'

const statusColors: Record<string, string> = {
  TRIAL: 'bg-lime/15 text-lime',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  TRIAL_EXPIRED: 'bg-amber-500/15 text-amber-400',
  SUSPENDED: 'bg-red-500/15 text-red-400',
  CANCELLED: 'bg-gray-500/15 text-gray-400',
}

type Empresa = {
  id: number; nombre: string; slug: string; subdominio: string | null; status: string
  trialEndsAt: string | null; diasTrial: number | null; createdAt: string
  plan: string; precioMensualUsd: number | null
  suscripcion: {
    estado: string; intervalo: string | null; cicloActual: number
    pagadoHasta: string | null; renovacionProxima: string | null; proveedor: string | null
  } | null
  totalPagadoCop: number; numPagos: number
  ultimoPago: { fecha: string; montoCop: number; proveedor: string } | null
  totalUsuarios: number; totalPrestamos: number
}

type Metrics = {
  conteos: {
    totalTenants: number; trialTenants: number; activeTenants: number
    expiredTenants: number; suspendedTenants: number
    totalUsuarios: number; totalPrestamos: number; totalPagos: number; tenant30d: number
  }
  ingresos: {
    mrrUsd: number; mrrCop: number
    mrrPorPlan: { plan: string; n: number; mensualUsd: number }[]
    recaudadoMesActualCop: number; recaudadoTotalCop: number
    empresasPagadas: number; conversionTrial: number
    porMes: { mes: string; etiqueta: string; cop: number }[]
  }
  empresas: Empresa[]
}

const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
const fechaFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-CO') : '—')

export default function AdminTenantPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/metrics')
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 401 || res.status === 403) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (!cancelled && data.success) setMetrics(data.data)
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router, refreshKey])

  async function updateTenantStatus(id: number, newStatus: string) {
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
      if (res.ok) setRefreshKey((k) => k + 1)
    } catch (e) {
      console.error(e)
    }
  }

  const empresas = metrics?.empresas ?? []
  const filteredTenants = empresas.filter((t) => {
    const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const c = metrics?.conteos
  const ing = metrics?.ingresos
  const maxMes = Math.max(1, ...(ing?.porMes.map((m) => m.cop) ?? [1]))

  return (
    <div className="min-h-screen bg-emerald-950 text-bone font-body p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display font-bold text-4xl text-white uppercase tracking-wider">ADMINISTRADOR</h1>
        </div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shrink-0"><img src="/logo.webp" alt="Kreditools" className="h-7 w-7 object-contain" /></span>
            <div>
              <h1 className="font-display font-bold text-2xl text-bone">Panel de Administración</h1>
              <p className="text-bone/60 text-sm mt-1">Gestiona todas las empresas en la plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CambiarPassword />
            <button onClick={() => router.push('/empresario')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bone/10 text-bone/60 hover:bg-emerald-950 transition-colors">
              <LayoutDashboard size={16} /> Ver Dashboard
            </button>
            <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); localStorage.removeItem('session'); router.push('/login') }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </div>

        {/* Empresas por estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {[
            { label: 'Total Empresas', value: c?.totalTenants ?? '—', color: 'text-bone', icon: <Building2 size={20} /> },
            { label: 'En Trial', value: c?.trialTenants ?? '—', color: 'text-lime', icon: <Clock size={20} /> },
            { label: 'Activas', value: c?.activeTenants ?? '—', color: 'text-emerald-400', icon: <CheckCircle2 size={20} /> },
            { label: 'Expiradas', value: c?.expiredTenants ?? '—', color: 'text-amber-400', icon: <AlertTriangle size={20} /> },
            { label: 'Suspendidas', value: c?.suspendedTenants ?? '—', color: 'text-red-400', icon: <Ban size={20} /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-bone/60 text-sm mb-2">{stat.icon} {stat.label}</div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Ingresos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-lime/30 bg-lime/5 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-bone/60 text-sm mb-2"><TrendingUp size={20} /> MRR (suscripciones activas)</div>
            <p className="text-2xl font-bold text-lime">${(ing?.mrrUsd ?? 0).toLocaleString('es-CO')} USD</p>
            <p className="text-xs text-bone/60 mt-1">≈ {copFmt.format(ing?.mrrCop ?? 0)} COP/mes</p>
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-bone/60 text-sm mb-2"><Wallet size={20} /> Recaudado este mes</div>
            <p className="text-2xl font-bold text-bone">{copFmt.format(ing?.recaudadoMesActualCop ?? 0)}</p>
            <p className="text-xs text-bone/60 mt-1">Histórico: {copFmt.format(ing?.recaudadoTotalCop ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-bone/60 text-sm mb-2"><DollarSign size={20} /> MRR por plan</div>
            {(ing?.mrrPorPlan.length ?? 0) === 0
              ? <p className="text-sm text-bone/40">Sin suscripciones activas</p>
              : ing!.mrrPorPlan.map((p) => (
                <p key={p.plan} className="text-sm text-bone/80">{p.plan}: {p.n} × ${p.mensualUsd.toLocaleString('es-CO')}</p>
              ))}
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-bone/60 text-sm mb-2"><Percent size={20} /> Conversión a pago</div>
            <p className="text-2xl font-bold text-bone">{ing?.conversionTrial ?? 0}%</p>
            <p className="text-xs text-bone/60 mt-1">{ing?.empresasPagadas ?? 0} de {c?.totalTenants ?? 0} empresas han pagado</p>
          </div>
        </div>

        {/* Recaudado por mes */}
        <div className="rounded-xl border border-bone/10 bg-graphite-900 p-5 shadow-sm mb-8">
          <h3 className="text-sm font-semibold text-bone mb-4">Recaudado por mes (COP)</h3>
          <div className="flex items-end gap-3 h-36">
            {(ing?.porMes ?? []).map((m) => (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] text-bone/60">{m.cop > 0 ? `$${Math.round(m.cop / 1000)}k` : ''}</span>
                <div className="w-full max-w-10 rounded-t-md bg-lime transition-all" style={{ height: `${Math.max(3, Math.round((m.cop / maxMes) * 100))}%` }} title={`${m.etiqueta}: ${copFmt.format(m.cop)}`} />
                <span className="text-[10px] uppercase text-bone/40">{m.etiqueta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 rounded-lg border border-bone/10 bg-graphite-900 px-3 py-2 w-72">
            <Search size={15} className="text-bone/60 shrink-0" />
            <input placeholder="Buscar empresa..." className="bg-transparent text-sm outline-none w-full text-bone" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="rounded-lg border border-bone/10 bg-graphite-900 px-3 py-2 text-sm text-bone outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">Todos los estados</option>
            <option value="TRIAL">En Trial</option>
            <option value="ACTIVE">Activas</option>
            <option value="TRIAL_EXPIRED">Expiradas</option>
            <option value="SUSPENDED">Suspendidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-bone/10 border-t-lime" /></div>
        ) : (
          <div className="rounded-xl border border-bone/10 bg-graphite-900 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-bone/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Empresa</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Estado / Trial</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Suscripción</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-bone/60 uppercase">Total pagado</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Último pago</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bone/10">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-emerald-950 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-lime/10 flex items-center justify-center text-lime font-semibold text-sm">
                          {tenant.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-bone">{tenant.nombre}</p>
                          <p className="text-xs text-bone/60 font-mono">{tenant.subdominio}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[tenant.status] || ''}`}>{tenant.status}</span>
                      {tenant.status === 'TRIAL' && tenant.diasTrial !== null && (
                        <p className="text-[11px] text-bone/60 mt-1">{tenant.diasTrial} días restantes</p>
                      )}
                      {tenant.status !== 'TRIAL' && (
                        <p className="text-[11px] text-bone/60 mt-1">{tenant.totalUsuarios} usuarios · {tenant.totalPrestamos} préstamos</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-bone/80">
                      {tenant.plan}
                      {tenant.precioMensualUsd !== null && (
                        <p className="text-[11px] text-bone/60">${tenant.precioMensualUsd.toLocaleString('es-CO')}/mes</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-bone/60">
                      {tenant.suscripcion ? (
                        <>
                          <p>{tenant.suscripcion.estado}{tenant.suscripcion.proveedor ? ` · ${tenant.suscripcion.proveedor}` : ''}</p>
                          <p>Ciclo {tenant.suscripcion.cicloActual}{tenant.suscripcion.intervalo ? ` · ${tenant.suscripcion.intervalo === 'ANUAL' ? 'anual' : 'mensual'}` : ''}</p>
                          <p>Pagado hasta {fechaFmt(tenant.suscripcion.pagadoHasta)}</p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-lime">
                      {tenant.numPagos > 0 ? copFmt.format(tenant.totalPagadoCop) : '—'}
                      {tenant.numPagos > 0 && <p className="text-[11px] font-normal text-bone/60">{tenant.numPagos} pago{tenant.numPagos !== 1 ? 's' : ''}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-bone/60">
                      {tenant.ultimoPago ? (
                        <>
                          <p className="text-bone/80 font-medium">{copFmt.format(tenant.ultimoPago.montoCop)}</p>
                          <p>{fechaFmt(tenant.ultimoPago.fecha)} · {tenant.ultimoPago.proveedor}</p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push(`/admin/tenants/${tenant.id}`)} className="p-1.5 rounded-lg text-bone/60 hover:text-lime hover:bg-emerald-950 transition-colors" title="Ver detalle"><Eye size={14} /></button>
                        {tenant.status === 'TRIAL' && (
                          <button onClick={() => updateTenantStatus(tenant.id, 'ACTIVE')} className="p-1.5 rounded-lg text-bone/60 hover:text-emerald-400 transition-colors" title="Activar"><CheckCircle2 size={14} /></button>
                        )}
                        {tenant.status === 'ACTIVE' && (
                          <button onClick={() => updateTenantStatus(tenant.id, 'SUSPENDED')} className="p-1.5 rounded-lg text-bone/60 hover:text-red-400 transition-colors" title="Suspender"><Ban size={14} /></button>
                        )}
                        {tenant.status === 'SUSPENDED' && (
                          <button onClick={() => updateTenantStatus(tenant.id, 'ACTIVE')} className="p-1.5 rounded-lg text-bone/60 hover:text-emerald-400 transition-colors" title="Reactivar"><RefreshCw size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-bone/40 text-sm">No se encontraron empresas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
