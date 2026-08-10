'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCheck, LogOut, Plus, ChevronUp, ChevronDown,
  Search, MoreHorizontal, Building2, CreditCard, AlertTriangle, DollarSign,
  BarChart3, X, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  Calendar, TrendingUp, AlertCircle, ChevronRight, FileText, Settings, Bell, History,
} from 'lucide-react'
import { Tooltip, InfoTip } from '@/components/Tooltip'
import CambiarPassword from '@/components/CambiarPassword'

const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
})

const numberFmt = new Intl.NumberFormat('es-CO')

type Vendedor = {
  id: number; cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null
  total_clientes: number; total_prestado: number
  recaudado_mes: number; comision_mes: number
}

type Cliente = {
  id: number; cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null; direccion: string | null
  prestamosCliente: {
    estado: string; montoSolicitado: string; montoPagado: string
    saldoPendiente: string; cuotaDiaria: string; diasAtrasados: number
  }[]
}

type VendedorDetalle = {
  id: number; cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null; direccion: string | null
  activo: number; _count: { clientes: number }; clientes: Cliente[]
}

type Stats = { total_vendedores: number; colocacion_total: number; atrasados: number }

type View = 'dashboard' | 'vendedores' | 'configuracion' | 'auditoria'

type ClienteDetalle = {
  id: number; cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null; direccion: string | null
  activo: number
  prestamos: {
    id: number; montoSolicitado: string; montoTotal: string; montoPagado: string
    saldoPendiente: string; cuotaDiaria: string; tasaInteres: string
    diasPlazo: number; diasPagados: number; diasAtrasados: number
    estado: string; fechaInicio: string; fechaFinEsperada: string
    pagos: {
      id: number; monto: string; fechaPago: string; diasCubiertos: number
      esPagoAtrasado: boolean; observacion: string | null
    }[]
  }[]
}

function Variacion({ valor, label }: { valor: string; label: string }) {
  const num = parseFloat(valor)
  const isPos = num >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {label}
    </span>
  )
}

function Badge({ variant, children }: { variant: 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/15 text-amber-400',
    info: 'bg-lime/10 text-lime',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[variant]}`}>{children}</span>
}

function Avatar({ nombre, apellido, size = 'md' }: { nombre: string; apellido: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${s} flex items-center justify-center rounded-full bg-lime/10 font-semibold text-lime shrink-0`}>
      {(nombre[0] + (apellido?.[0] || '')).toUpperCase()}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('dashboard')
  const [showSidebar, setShowSidebar] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', telefono: '', direccion: '', email: '' })
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dashVendedorId, setDashVendedorId] = useState<number | null>(null)
  const [dashClientes, setDashClientes] = useState<Cliente[] | null>(null)
  const [modalCliente, setModalCliente] = useState<ClienteDetalle | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [planInfo, setPlanInfo] = useState<{ status: string; trialEndsAt?: string } | null>(null)
  const [userInfo, setUserInfo] = useState<{ nombre: string; apellido: string } | null>(null)
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [tenantLogo, setTenantLogo] = useState<string | null>(null)
  const [comisionPorcentaje, setComisionPorcentaje] = useState(0)

  const cargarDatos = async () => {
    const r = await fetch('/api/dashboard')
    const d = await r.json()
    if (!d.success) { router.push('/login'); return }
    setVendedores(d.data.vendedores)
    setStats(d.data.stats)
    if (d.data.user) setUserInfo(d.data.user)
    if (d.data.tenantName) setTenantName(d.data.tenantName)
    if (d.data.tenantLogo) setTenantLogo(d.data.tenantLogo)
    if (d.data.comisionPorcentaje != null) setComisionPorcentaje(d.data.comisionPorcentaje)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (!d.success) { router.push('/login'); return }
        setVendedores(d.data.vendedores)
        setStats(d.data.stats)
        if (d.data.user) setUserInfo(d.data.user)
        if (d.data.tenantName) setTenantName(d.data.tenantName)
        if (d.data.tenantLogo) setTenantLogo(d.data.tenantLogo)
        if (d.data.comisionPorcentaje != null) setComisionPorcentaje(d.data.comisionPorcentaje)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    fetch('/api/subscriptions/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPlanInfo({ status: d.data.tenant.status, trialEndsAt: d.data.tenant.trialEndsAt })
      })
      .catch(() => {})
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  async function handleCreateVendedor(e: FormEvent) {
    e.preventDefault()
    setFormMsg(null)
    const res = await fetch('/api/vendedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      setForm({ nombre: '', apellido: '', cedula: '', telefono: '', direccion: '', email: '' })
      setFormMsg(null)
      setShowVendedorModal(false)
      await cargarDatos()
    } else {
      setFormMsg({ ok: false, text: data.message })
    }
  }

  async function loadDashClientes(id: number) {
    setDashVendedorId(id)
    setDashClientes(null)
    const r = await fetch(`/api/clientes?vendedor_id=${id}`)
    const d = await r.json()
    if (d.success) setDashClientes(d.data)
  }

  async function openClienteModal(clienteId: number) {
    setModalLoading(true)
    setModalCliente(null)
    const r = await fetch(`/api/clientes?id=${clienteId}`)
    const d = await r.json()
    if (d.success) setModalCliente(d.data)
    setModalLoading(false)
  }



  const vendedoresActivos = vendedores.length
  const colocacion = stats?.colocacion_total ?? 0
  const atrasados = stats?.atrasados ?? 0

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex min-h-screen bg-emerald-950">
      {/* ── Overlay móvil ── */}
      {showSidebar && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-300 ease-in-out lg:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shrink-0"><img src={tenantLogo || '/logo.webp'} alt={tenantName || 'PagoExpress'} className="h-6 w-6 object-contain" /></span>
            <span className="text-base font-bold text-zinc-100">{tenantName || 'PagoExpress'}</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="lg:hidden text-zinc-400 hover:text-zinc-100" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-emerald-950 px-3 py-2 text-sm text-zinc-400">
            <Search size={15} />
            <span>Buscar...</span>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 px-3">
          <SidebarBtn icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setShowSidebar(false) }} />
          <SidebarBtn icon={<Users size={18} />} label="Vendedores" active={view === 'vendedores'} onClick={() => { setView('vendedores'); setShowSidebar(false) }} />
          <SidebarBtn icon={<CreditCard size={18} />} label="Suscripción" active={false} onClick={() => { router.push('/empresario/billing'); setShowSidebar(false) }} />
          <SidebarBtn icon={<Settings size={18} />} label="Configuración" active={view === 'configuracion'} onClick={() => { setView('configuracion'); setShowSidebar(false) }} />
          <SidebarBtn icon={<History size={18} />} label="Auditoría" active={view === 'auditoria'} onClick={() => { setView('auditoria'); setShowSidebar(false) }} />
        </nav>

        <div className="border-t border-zinc-800 px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Accounts</p>
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-emerald-950 cursor-pointer">
            <div className="relative">
              <Avatar nombre="Super" apellido="Admin" size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">Super Admin</p>
              <p className="text-[11px] text-zinc-500">superadmin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-[220px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden text-zinc-400 hover:text-zinc-100 p-1" aria-label="Abrir menú">
              <LayoutDashboard size={20} />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 sm:text-sm">
              <span className="text-zinc-100 font-medium">Dashboard</span>
              <span className="mx-1">/</span>
              <span>{view === 'dashboard' ? 'Resumen' : view === 'vendedores' ? 'Vendedores' : view === 'configuracion' ? 'Configuración' : view === 'auditoria' ? 'Auditoría' : 'Clientes'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:block text-sm text-zinc-400">{today}</span>
            <CambiarPassword />
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-emerald-950 transition-colors sm:px-3 sm:text-sm">
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-4 sm:mb-6">
            <h1 className="font-display font-bold text-xl sm:text-2xl lg:text-4xl text-white uppercase tracking-wider text-center sm:text-left">
              {tenantName || 'EMPRESA'} : {userInfo ? `${userInfo.nombre} ${userInfo.apellido}` : 'Empresario'}
            </h1>
          </div>
          {planInfo && (planInfo.status === 'TRIAL_EXPIRED' || planInfo.status === 'SUSPENDED' || planInfo.status === 'CANCELLED') && (
            <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400 sm:hidden" />
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-400 hidden sm:block" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-300">Tu plan está {planInfo.status === 'TRIAL_EXPIRED' ? 'vencido' : 'suspendido'}</p>
                  <p className="mt-1 text-amber-200/80">Activa un plan para restablecer el acceso completo.</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/empresario/billing')}
                className="shrink-0 w-full rounded-full bg-lime px-5 py-2.5 font-display text-sm font-semibold text-emerald-950 hover:bg-zinc-100 transition-colors sm:w-auto"
              >
                Ver planes
              </button>
            </div>
          )}

          {/* ══════ DASHBOARD ══════ */}
          {view === 'dashboard' && (
            <>
              <div className="mb-8">
                <h2 className="text-base font-semibold text-zinc-100">Resumen general</h2>
                <p className="mt-0.5 text-sm text-zinc-400">Métrica general del sistema de préstamos</p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:gap-5 xl:grid-cols-5">
                <KpiCard
                  icon={<Building2 size={18} />}
                  iconBg="bg-lime/10 text-lime"
                  label="Vendedores activos"
                  value={numberFmt.format(vendedoresActivos)}
                  variacion="+0%"
                  variacionLabel="vs mes anterior"
                  tip="Cantidad de vendedores que están trabajando en el sistema"
                />
                <KpiCard
                  icon={<DollarSign size={18} />}
                  iconBg="bg-emerald-500/20 text-emerald-400"
                  label="Colocación total"
                  value={moneyFmt.format(colocacion)}
                  variacion={colocacion > 0 ? '+12.5%' : '0%'}
                  variacionLabel="total prestado"
                  tip="Dinero total que se ha prestado a todos los clientes"
                />
                <KpiCard
                  icon={<CreditCard size={18} />}
                  iconBg="bg-lime/10 text-lime"
                  label="Préstamos activos"
                  value="—"
                  variacion="+2.1%"
                  variacionLabel="este mes"
                  tip="Préstamos que están en curso y aún no se pagan completamente"
                />
                <KpiCard
                  icon={<AlertTriangle size={18} />}
                  iconBg="bg-red-500/15 text-red-400"
                  label="Clientes en mora"
                  value={numberFmt.format(atrasados)}
                  variacion={atrasados > 0 ? `+${atrasados}` : '0'}
                  variacionLabel="requieren atención"
                  tip="Clientes que tienen préstamos con días de atraso en sus pagos"
                />
                {comisionPorcentaje > 0 && (
                  <KpiCard
                    icon={<TrendingUp size={18} />}
                    iconBg="bg-lime/10 text-lime"
                    label="Comisiones mes"
                    value={moneyFmt.format(vendedores.reduce((s, v) => s + v.comision_mes, 0))}
                    variacion={`${comisionPorcentaje}%`}
                    variacionLabel={`${comisionPorcentaje}% sobre recaudado`}
                    tip="Total de comisiones generadas por todos los vendedores este mes"
                  />
                )}
              </div>

              {/* ── Alertas de mora ── */}
              {atrasados > 0 && (
                <div className={`rounded-xl border-2 p-3 sm:p-5 mb-6 ${
                  atrasados >= 5 ? 'border-[#EF4444] bg-red-500/15' : 'border-[#F59E0B] bg-amber-500/15'
                }`}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${
                      atrasados >= 5 ? 'bg-red-500' : 'bg-amber-500'
                    }`}>
                      <AlertTriangle size={16} className="sm:hidden text-zinc-100" />
                      <AlertTriangle size={20} className="hidden sm:block text-zinc-100" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className={`text-sm sm:text-base font-bold ${atrasados >= 5 ? 'text-red-400' : 'text-amber-400'}`}>
                            {atrasados} cliente{atrasados !== 1 ? 's' : ''} en mora
                          </p>
                          <p className="text-xs sm:text-sm mt-1 text-zinc-400">
                            {atrasados >= 5
                              ? 'Se requiere atención urgente. Hay múltiples clientes con pagos atrasados.'
                              : 'Hay clientes con pagos pendientes. Revisa la lista para tomar acción.'}
                          </p>
                        </div>
                        <button onClick={async () => {
                          try {
                            const r = await fetch('/api/recordatorios', { method: 'POST' })
                            const d = await r.json()
                            alert(d.message || 'Recordatorios enviados')
                          } catch { alert('Error al enviar recordatorios') }
                        }} className="flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-red-400 hover:bg-emerald-950 transition-colors shadow-sm">
                          <Bell size={14} /> Enviar recordatorios
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                    <h3 className="text-sm font-semibold text-zinc-100">Vendedores</h3>
                    <button onClick={() => setView('vendedores')} className="text-xs font-medium text-lime hover:underline">Ver todos</button>
                  </div>
                  <div className="divide-y divide-zinc-700 max-h-[350px] overflow-y-auto">
                    {vendedores.length === 0 ? (
                      <p className="px-5 py-10 text-center text-sm text-zinc-400">No hay vendedores registrados</p>
                    ) : (
                      vendedores.map((v) => (
                        <button key={v.id} onClick={() => loadDashClientes(v.id)}
                          className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                            dashVendedorId === v.id ? 'bg-lime/10' : 'hover:bg-emerald-950'
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <Avatar nombre={v.nombre} apellido={v.apellido} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-zinc-100 uppercase">{v.nombre} {v.apellido}</p>
                              <p className="text-xs text-zinc-400">{v.total_clientes} clientes</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-medium text-lime">{moneyFmt.format(v.total_prestado)}</span>
                            {comisionPorcentaje > 0 && (
                              <p className="text-[10px] text-lime/70">Comisión: {moneyFmt.format(v.comision_mes)}</p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
                  <div className="border-b border-zinc-800 px-5 py-4">
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {dashClientes ? `Clientes de ${vendedores.find(v => v.id === dashVendedorId)?.nombre || ''}` : 'Clientes'}
                    </h3>
                  </div>
                  {!dashVendedorId ? (
                    <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
                      <Users size={20} className="mr-2 opacity-50" />
                      Selecciona un vendedor para ver sus clientes
                    </div>
                  ) : !dashClientes ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-lime-500" />
                    </div>
                  ) : dashClientes.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
                      Este vendedor no tiene clientes
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-700 max-h-[350px] overflow-y-auto">
                      {dashClientes.map((c) => {
                        const activos = c.prestamosCliente.filter((p) => p.estado === 'activo')
                        const saldo = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
                        const enMora = activos.some((p) => p.diasAtrasados > 0)
                        return (
                          <button key={c.id} onClick={() => openClienteModal(c.id)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-emerald-950 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-zinc-100 uppercase">{c.nombre} {c.apellido}</p>
                                <p className="text-xs text-zinc-400">{c.cedula}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${enMora ? 'text-red-400' : 'text-zinc-100'}`}>
                                  {moneyFmt.format(saldo)}
                                </p>
                                <p className="text-xs text-zinc-400">{activos.length} préstamo{activos.length !== 1 ? 's' : ''}</p>
                              </div>
                              <ChevronRight size={16} className="text-zinc-100/40" />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══════ VENDEDORES ══════ */}
          {view === 'vendedores' && (
            <>
              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Vendedores</h2>
                  <p className="mt-0.5 text-sm text-zinc-400">Gestiona los vendedores del sistema</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/api/reportes/vendedores" target="_blank"
                    className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-400 hover:bg-emerald-950 transition-colors">
                    <FileText size={15} /> Reporte Vendedores
                  </a>
                  <a href="/api/reportes/clientes" target="_blank"
                    className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-400 hover:bg-emerald-950 transition-colors">
                    <FileText size={15} /> Reporte Clientes
                  </a>
                  <button onClick={() => { setShowVendedorModal(true); setFormMsg(null); setForm({ nombre: '', apellido: '', cedula: '', telefono: '', direccion: '', email: '' }) }} className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-lg bg-lime px-3.5 py-1.5 text-sm font-medium text-emerald-950 font-display hover:bg-zinc-100 transition-colors shadow-sm">
                    <Plus size={15} /> Agregar
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <h3 className="text-sm font-semibold text-zinc-100">Lista de vendedores</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                        <th className="px-5 py-3.5 text-left font-medium">Vendedor</th>
                        <th className="px-5 py-3.5 text-left font-medium">Cédula</th>
                        <th className="px-5 py-3.5 text-left font-medium">Contacto</th>
                        <th className="px-5 py-3.5 text-right font-medium">Clientes</th>
                        <th className="px-5 py-3.5 text-right font-medium">Colocación</th>
                        {comisionPorcentaje > 0 && (
                          <th className="px-5 py-3.5 text-right font-medium">Comisión mes</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-700">
                      {vendedores.length === 0 ? (
                        <tr><td colSpan={comisionPorcentaje > 0 ? 6 : 5} className="px-5 py-10 text-center text-sm text-zinc-400">No hay vendedores registrados</td></tr>
                      ) : (
                        vendedores.map((v) => (
                          <tr key={v.id} className="hover:bg-emerald-950 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar nombre={v.nombre} apellido={v.apellido} />
                                <div>
                                  <p className="font-medium text-zinc-100 uppercase">{v.nombre} {v.apellido}</p>
                                  <p className="text-xs text-zinc-400">{v.email || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono text-zinc-400">{v.cedula}</td>
                            <td className="px-5 py-3.5 text-sm text-zinc-400">{v.telefono || '-'}</td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="rounded-full bg-lime/10 px-2.5 py-0.5 text-xs font-medium text-lime">{v.total_clientes}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-zinc-100">{moneyFmt.format(v.total_prestado)}</td>
                            {comisionPorcentaje > 0 && (
                              <td className="px-5 py-3.5 text-right">
                                <span className="text-sm font-semibold text-lime">{moneyFmt.format(v.comision_mes)}</span>
                                <p className="text-[10px] text-zinc-400">{comisionPorcentaje}% de {moneyFmt.format(v.recaudado_mes)}</p>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ══════ CONFIGURACIÓN ══════ */}
          {view === 'configuracion' && <ConfigView />}

          {/* ══════ AUDITORÍA ══════ */}
          {view === 'auditoria' && <AuditoriaView />}

        </div>
      </div>

      {/* ── Modal Crear Vendedor ── */}
      {showVendedorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowVendedorModal(false); setFormMsg(null) }} />
          <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h3 className="text-sm font-semibold text-zinc-100">Crear nuevo vendedor</h3>
              <button onClick={() => { setShowVendedorModal(false); setFormMsg(null) }} className="rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-950 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateVendedor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Nombre *</label>
                  <input placeholder="Nombre" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Apellido</label>
                  <input placeholder="Apellido" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Cédula *</label>
                  <input placeholder="Cédula" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Teléfono</label>
                  <input placeholder="Teléfono" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Email</label>
                  <input placeholder="Email" type="email" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">Dirección</label>
                  <input placeholder="Dirección" className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full rounded-lg bg-lime px-4 py-2.5 text-sm font-medium text-emerald-950 font-display hover:bg-zinc-100 transition-colors">
                Crear Vendedor
              </button>
              {formMsg && (
                <div className={`rounded-lg p-3 text-sm ${formMsg.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {formMsg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{formMsg.text}</> : <><X size={14} className="inline mr-1" />{formMsg.text}</>}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Cliente Detalle ── */}
      {(modalCliente || modalLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalCliente(null)} />
          <div className="relative bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-4 rounded-t-2xl">
              {modalCliente ? (
                <div className="flex items-center gap-3">
                  <Avatar nombre={modalCliente.nombre} apellido={modalCliente.apellido} />
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100 uppercase">{modalCliente.nombre} {modalCliente.apellido}</h2>
                    <p className="text-sm text-zinc-400">Cédula: {modalCliente.cedula}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-lime/10" />
                  <div>
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="mt-1 h-3 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              )}
              <button onClick={() => setModalCliente(null)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-950 transition-colors">
                <X size={20} />
              </button>
            </div>

            {modalLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-lime-500" />
              </div>
            )}

            {modalCliente && (
              <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* Info del cliente */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <InfoItem icon={<FileText size={14} />} label="Cédula" value={modalCliente.cedula} />
                  <InfoItem icon={<Calendar size={14} />} label="Teléfono" value={modalCliente.telefono || '—'} />
                  <InfoItem icon={<DollarSign size={14} />} label="Email" value={modalCliente.email || '—'} />
                  <InfoItem icon={<TrendingUp size={14} />} label="Dirección" value={modalCliente.direccion || '—'} />
                </div>

                {/* Alertas de mora */}
                {modalCliente.prestamos.some((p) => p.diasAtrasados > 0) && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/15 p-4">
                    <div className="flex items-center gap-2 text-red-400 font-medium text-sm mb-1">
                      <AlertTriangle size={16} />
                      Cliente en mora
                    </div>
                    <p className="text-xs text-red-500">
                      Tiene préstamos con atraso. El cliente debe ponerse al día con sus pagos.
                    </p>
                  </div>
                )}

                {/* Préstamos */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-3">Préstamos</h3>
                  {modalCliente.prestamos.length === 0 ? (
                    <p className="text-sm text-zinc-400">No tiene préstamos registrados</p>
                  ) : (
                    <div className="space-y-4">
                      {modalCliente.prestamos.map((p) => {
                        const montoTotal = Number(p.montoTotal)
                        const montoPagado = Number(p.montoPagado)
                        const cuotaDiaria = Number(p.cuotaDiaria)
                        const tasaInteres = Number(p.tasaInteres)
                        const porcentaje = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0
                        const diasRestantes = p.diasPlazo - p.diasPagados
                        const fechaInicio = new Date(p.fechaInicio).toLocaleDateString('es-CO')
                        const fechaVenc = new Date(p.fechaFinEsperada).toLocaleDateString('es-CO')

                        return (
                          <div key={p.id} className={`rounded-xl border p-4 sm:p-5 ${
                            p.diasAtrasados > 0 ? 'border-red-500/30 bg-red-500/15' : 
                            p.estado === 'pagado' ? 'border-emerald-500/30 bg-emerald-500/20' : 'border-zinc-800 bg-zinc-900'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={p.estado === 'pagado' ? 'success' : p.diasAtrasados > 0 ? 'warning' : 'info'}>
                                  {p.estado === 'pagado' ? 'Pagado' : p.diasAtrasados > 0 ? `${p.diasAtrasados} días atrasado` : 'Activo'}
                                </Badge>
                              </div>
                              <span className="text-xs text-zinc-400">{fechaInicio} → {fechaVenc}</span>
                            </div>

                            {/* Montos */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-4">
                              <div>
                                <p className="text-xs text-zinc-400 flex items-center gap-1">Monto solicitado <InfoTip text="Dinero que el cliente pidió prestado." /></p>
                                <p className="text-sm font-semibold text-zinc-100">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400 flex items-center gap-1">Total deuda (+{Number(p.tasaInteres)}%) <InfoTip text="El monto prestado más el interés. Es lo total que debe devolver el cliente." /></p>
                                <p className="text-sm font-semibold text-zinc-100">{moneyFmt.format(montoTotal)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400 flex items-center gap-1">Monto pagado <InfoTip text="Dinero que el cliente ya ha pagado. Reduce el saldo pendiente." /></p>
                                <p className="text-sm font-semibold text-emerald-400">{moneyFmt.format(montoPagado)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-400 flex items-center gap-1">Saldo pendiente <InfoTip text="Lo que falta por pagar. Cuando llega a $0, el préstamo está completado." /></p>
                                <p className="text-sm font-semibold text-red-400">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                              </div>
                            </div>

                            {/* Detalles */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-center mb-4">
                              <DetailChip label="Cuota diaria" value={moneyFmt.format(cuotaDiaria)} tip="Cantidad que el cliente debe pagar cada día." />
                              <DetailChip label="Tasa interés" value={`${tasaInteres}%`} tip="Porcentaje de interés que se aplica sobre el monto prestado." />
                              <DetailChip label="Días pagados" value={`${p.diasPagados}/${p.diasPlazo}`} tip="Días que el cliente ya pagó vs el total del plazo." />
                              <DetailChip label="Días restantes" value={`${Math.max(0, diasRestantes)}`} tip="Días que faltan para terminar de pagar el préstamo." />
                            </div>

                            {/* Barra de progreso */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                <span className="flex items-center gap-1">Progreso <InfoTip text="Porcentaje del préstamo que ya fue pagado. Al llegar a 100%, el préstamo está completo." /></span>
                                <span>{porcentaje.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-zinc-100/10">
                                <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${Math.min(100, porcentaje)}%` }} />
                              </div>
                            </div>

                            {/* Historial de pagos */}
                            {p.pagos.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-zinc-100 mb-2">Pagos recientes ({p.pagos.length})</p>
                                <div className="max-h-32 overflow-y-auto space-y-1.5">
                                  {p.pagos.slice(0, 10).map((pg) => (
                                    <div key={pg.id} className="flex items-center justify-between rounded-lg bg-zinc-900/70 px-3 py-2 text-xs border border-zinc-800/50">
                                      <div className="flex items-center gap-2">
                                        {pg.esPagoAtrasado ? (
                                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        ) : (
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        )}
                                        <span className="text-zinc-400">{new Date(pg.fechaPago).toLocaleDateString('es-CO')}</span>
                                        {pg.observacion && <span className="text-zinc-100/40 italic">({pg.observacion})</span>}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-zinc-400">{pg.diasCubiertos} días</span>
                                        <span className="font-semibold text-zinc-100">{moneyFmt.format(Number(pg.monto))}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Subcomponents ── */

function SidebarBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
      active ? 'bg-lime/10 text-lime font-semibold' : 'text-zinc-400 hover:bg-emerald-950 hover:text-zinc-100'
    }`}>
      {icon}
      {label}
    </button>
  )
}

function KpiCard({ icon, iconBg, label, value, variacion, variacionLabel, tip }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; variacion: string; variacionLabel: string; tip?: string
}) {
  const isPos = !variacion.startsWith('-')
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${iconBg}`}>{icon}</div>
        <Variacion valor={variacion} label={variacion} />
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <p className="text-[11px] text-zinc-400 sm:text-sm">{label}</p>
        {tip && <InfoTip text={tip} />}
      </div>
      <p className="text-lg font-bold text-zinc-100 sm:text-2xl">{value}</p>
      <p className="mt-1 hidden text-xs text-zinc-400 sm:block">{variacionLabel}</p>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-emerald-950 p-3">
      <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-medium text-zinc-100 truncate">{value}</p>
    </div>
  )
}

function DetailChip({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <div className="rounded-lg bg-emerald-950 p-2">
      <p className="text-[10px] text-zinc-400 mb-0.5 flex items-center justify-center gap-1">{label} {tip && <InfoTip text={tip} />}</p>
      <p className="text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  )
}

function ConfigView() {
  const [tasaInteres, setTasaInteres] = useState('20')
  const [cuotaDiaria, setCuotaDiaria] = useState('5000')
  const [porcentajeComision, setPorcentajeComision] = useState('0')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/empresa/configuracion')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTasaInteres(String(Number(d.data.tasaInteres)))
          setCuotaDiaria(String(Number(d.data.cuotaDiariaMin)))
          setPorcentajeComision(String(Number(d.data.porcentajeComisionVendedor ?? 0)))
          if (d.data.logoUrl) setLogoUrl(d.data.logoUrl)
        }
      })
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/empresa/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasaInteres, cuotaDiariaMin: cuotaDiaria, porcentajeComisionVendedor: porcentajeComision }),
    })
    const d = await res.json()
    setMsg(d.success ? { ok: true, text: 'Configuración guardada' } : { ok: false, text: d.message })
    setSaving(false)
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setLogoError(null)
    setLogoPreview(null)
    setLogoFile(null)
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('Formato no permitido (usa PNG, JPG o WebP)')
      return
    }
    if (file.size > 200 * 1024) {
      setLogoError('La imagen supera los 200 KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(String(reader.result || ''))
    reader.onerror = () => setLogoError('No se pudo leer el archivo')
    reader.readAsDataURL(file)
    setLogoFile(file)
  }

  async function handleLogoUpload() {
    if (!logoFile) return
    setLogoLoading(true)
    setMsg(null)
    setLogoError(null)
    const fd = new FormData()
    fd.append('file', logoFile)
    const res = await fetch('/api/empresa/logo', { method: 'POST', body: fd })
    const d = await res.json()
    setLogoLoading(false)
    if (d.success) {
      setLogoUrl(d.logoUrl)
      setLogoPreview(null)
      setLogoFile(null)
      setMsg({ ok: true, text: 'Logo guardado' })
    } else {
      setLogoError(d.message || 'Error al subir el logo')
    }
  }

  async function handleLogoRemove() {
    setLogoLoading(true)
    setMsg(null)
    setLogoError(null)
    const fd = new FormData()
    fd.append('action', 'remove')
    const res = await fetch('/api/empresa/logo', { method: 'POST', body: fd })
    const d = await res.json()
    setLogoLoading(false)
    if (d.success) {
      setLogoUrl(null)
      setLogoPreview(null)
      setLogoFile(null)
      setMsg({ ok: true, text: 'Logo eliminado' })
    } else {
      setLogoError(d.message || 'Error al eliminar el logo')
    }
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-zinc-100">Configuración del sistema</h2>
        <p className="mt-0.5 text-sm text-zinc-400">Tasa de interés, cuota diaria mínima, comisiones y logo de tu empresa</p>
      </div>

      <div className="max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Logo de la empresa</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-800 overflow-hidden shrink-0">
              <img src={logoPreview || logoUrl || '/logo.webp'} alt="Logo de la empresa" className="h-full w-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <label htmlFor="empresa-logo" className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors">
                {logoPreview ? 'Elegir otro archivo' : 'Subir logo'}
                <input id="empresa-logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoFile} />
              </label>
              <p className="text-[11px] text-zinc-400">PNG, JPG o WebP · máximo 200 KB</p>
            </div>
          </div>
          {logoPreview && (
            <button type="button" onClick={handleLogoUpload} disabled={logoLoading}
              className="w-full rounded-lg bg-lime px-4 py-2.5 text-sm font-medium text-emerald-950 font-display hover:bg-zinc-100 transition-colors disabled:opacity-50">
              {logoLoading ? 'Guardando...' : 'Confirmar nuevo logo'}
            </button>
          )}
          {logoUrl && !logoPreview && (
            <button type="button" onClick={handleLogoRemove} disabled={logoLoading}
              className="w-full rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50">
              Quitar logo
            </button>
          )}
          {logoError && (
            <div className="rounded-lg bg-red-500/15 p-3 text-sm text-red-400">
              <X size={14} className="inline mr-1" />{logoError}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h3 className="text-sm font-semibold text-zinc-100">Parámetros de préstamos</h3>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 flex items-center gap-1">Tasa de interés (%) <InfoTip text="Porcentaje que se cobra por prestar dinero. Se calcula sobre el monto solicitado. Ej: si prestas $100.000 con 20% de interés, el cliente debe devolver $120.000." /></label>
            <input type="number" step="0.01" min="0.01"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
              value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} required />
            <p className="mt-1 text-[11px] text-zinc-400">Porcentaje de interés aplicado sobre el monto solicitado</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 flex items-center gap-1">Cuota diaria mínima ($) <InfoTip text="El valor mínimo que el cliente debe pagar cada día. Se usa para calcular cuántos días tardará en pagar un préstamo." /></label>
            <input type="number" step="100" min="100"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
              value={cuotaDiaria} onChange={(e) => setCuotaDiaria(e.target.value)} required />
            <p className="mt-1 text-[11px] text-zinc-400">Valor de la cuota diaria base para el cálculo de los días de plazo</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400 flex items-center gap-1">Comisión vendedor (%) <InfoTip text="Porcentaje que el vendedor gana sobre el total recaudado cada mes. Ej: si recauda $1.000.000 y la comisión es 5%, gana $50.000." /></label>
            <input type="number" step="0.01" min="0" max="100"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20"
              value={porcentajeComision} onChange={(e) => setPorcentajeComision(e.target.value)} required />
            <p className="mt-1 text-[11px] text-zinc-400">Porcentaje de ganancia del vendedor sobre lo recaudado mensualmente</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-lime px-4 py-2.5 text-sm font-medium text-emerald-950 font-display hover:bg-zinc-100 transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {msg && (
            <div className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
              {msg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{msg.text}</> : <><X size={14} className="inline mr-1" />{msg.text}</>}
            </div>
          )}
        </form>
      </div>
    </>
  )
}

type AuditDetalles = {
  anterior?: { monto: number; fecha?: string }
  nuevo?: { monto: number; fecha?: string }
  motivo?: string
}

type AuditRecord = {
  id: number
  accion: string
  detalles: string | null
  createdAt: string
  usuario: { nombre: string; apellido: string; rol: string }
}

function AuditoriaView() {
  const [registros, setRegistros] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const cargar = async () => {
    setLoading(true)
    const r = await fetch('/api/historial?tabla=pagos&limit=200')
    const d = await r.json()
    if (d.success) {
      setRegistros(d.data)
      setTotal(d.total)
    }
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/historial?tabla=pagos&limit=200')
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (d.success) {
          setRegistros(d.data)
          setTotal(d.total)
        }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const money = (n: number) => n.toLocaleString('es-CO')

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-zinc-100">Auditoría de pagos</h2>
        <p className="mt-0.5 text-sm text-zinc-400">{total} registro(s) — ediciones y eliminaciones de pagos</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-lime-500" />
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-10 text-center text-sm text-zinc-400">
          No hay registros de auditoría
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                <th className="px-5 py-3.5 text-left font-medium">Fecha</th>
                <th className="px-5 py-3.5 text-left font-medium">Usuario</th>
                <th className="px-5 py-3.5 text-left font-medium">Acción</th>
                <th className="px-5 py-3.5 text-left font-medium">Detalles</th>
                <th className="px-5 py-3.5 text-left font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {registros.map((r) => {
                let detalles: AuditDetalles = {}
                try { detalles = JSON.parse(r.detalles || '{}') } catch { }
                const esEliminar = r.accion === 'eliminar_pago'
                return (
                  <tr key={r.id} className="hover:bg-emerald-950 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-medium text-zinc-100">{r.usuario.nombre} {r.usuario.apellido}</span>
                      <span className="text-[10px] text-zinc-400 ml-1">({r.usuario.rol})</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        esEliminar ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {esEliminar ? 'Eliminación' : 'Edición'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {detalles.anterior && (
                        <div>
                          <span className="text-zinc-100/40">Anterior: </span>
                          <span className="font-mono">${money(detalles.anterior.monto)}</span>
                          {detalles.anterior.fecha && (
                            <span className="text-zinc-100/40 ml-1">
                              ({new Date(detalles.anterior.fecha).toLocaleDateString('es-CO')})
                            </span>
                          )}
                        </div>
                      )}
                      {detalles.nuevo && (
                        <div>
                          <span className="text-emerald-400">Nuevo: </span>
                          <span className="font-mono">${money(detalles.nuevo.monto)}</span>
                          {detalles.nuevo.fecha && (
                            <span className="text-emerald-400 ml-1">
                              ({new Date(detalles.nuevo.fecha).toLocaleDateString('es-CO')})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400 italic max-w-[200px] truncate">
                      {detalles.motivo || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
