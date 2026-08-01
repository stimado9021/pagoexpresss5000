'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, CreditCard, Settings, LogOut,
  Search, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Ban, RefreshCw,
  Shield, Eye, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Tooltip, InfoTip } from '@/components/Tooltip'
import type { Tenant } from '@prisma/client'

const statusColors: Record<string, string> = {
  TRIAL: 'bg-lime/15 text-lime',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400',
  TRIAL_EXPIRED: 'bg-amber-500/15 text-amber-400',
  SUSPENDED: 'bg-red-500/15 text-red-400',
  CANCELLED: 'bg-gray-500/15 text-gray-400',
}

export default function AdminTenantPage() {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/tenants')
      if (res.status === 401 || res.status === 403) {
        router.push('/login')
        return
      }
      const data = await res.json()
      if (data.success) {
        setTenants(data.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function updateTenantStatus(id: number, newStatus: string) {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchTenants()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const stats = {
    total: tenants.length,
    trial: tenants.filter((t) => t.status === 'TRIAL').length,
    active: tenants.filter((t) => t.status === 'ACTIVE').length,
    expired: tenants.filter((t) => t.status === 'TRIAL_EXPIRED').length,
    suspended: tenants.filter((t) => t.status === 'SUSPENDED').length,
  }

  const filteredTenants = tenants.filter((t) => {
    const matchesSearch = t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen bg-emerald-950 text-bone font-body p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shrink-0"><img src="/logo.png" alt="PagoExpress" className="h-7 w-7 object-contain" /></span>
            <div>
              <h1 className="font-display font-bold text-2xl text-bone">Panel de Administraci�n</h1>
              <p className="text-bone/60 text-sm mt-1">Gestiona todas las empresas en la plataforma</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/empresario')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-bone/10 text-bone/60 hover:bg-emerald-950 transition-colors">
              <LayoutDashboard size={16} /> Ver Dashboard
            </button>
            <button onClick={() => { router.push('/login'); localStorage.removeItem('session') }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors">
              <LogOut size={16} /> Cerrar sesi�n
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Empresas', value: stats.total, color: 'text-bone', icon: <Building2 size={20} /> },
            { label: 'En Trial', value: stats.trial, color: 'text-lime', icon: <Clock size={20} /> },
            { label: 'Activas', value: stats.active, color: 'text-emerald-400', icon: <CheckCircle2 size={20} /> },
            { label: 'Expiradas', value: stats.expired, color: 'text-amber-400', icon: <AlertTriangle size={20} /> },
            { label: 'Suspendidas', value: stats.suspended, color: 'text-red-400', icon: <Ban size={20} /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-bone/10 bg-graphite-900 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-bone/60 text-sm mb-2">{stat.icon} {stat.label}</div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
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
          <div className="rounded-xl border border-bone/10 bg-graphite-900 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-bone/10">
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Empresa</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Subdominio</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-bone/60 uppercase">Trial</th>
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
                          <p className="text-xs text-bone/60">Registrado {new Date(tenant.createdAt).toLocaleDateString('es-CO')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-bone/80 font-mono">{tenant.subdominio}</td>
                    <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusColors[tenant.status] || ''}`}>{tenant.status}</span></td>
                    <td className="px-5 py-3.5 text-sm text-bone/60">{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString('es-CO') : '—'}</td>
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
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-bone/40 text-sm">No se encontraron empresas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}