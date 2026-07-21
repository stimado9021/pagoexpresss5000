'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCheck, LogOut, Plus, ChevronUp, ChevronDown,
  Search, MoreHorizontal, Building2, CreditCard, AlertTriangle, DollarSign,
  BarChart3, X, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  Calendar, TrendingUp, AlertCircle, ChevronRight, FileText, Settings, Bell, History,
} from 'lucide-react'

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
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPos ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
      {isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {label}
    </span>
  )
}

function Badge({ variant, children }: { variant: 'success' | 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    success: 'bg-[#ECFDF5] text-[#10B981]',
    warning: 'bg-[#FFFBEB] text-[#F59E0B]',
    info: 'bg-[#EEF0FF] text-[#5B5FEF]',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${styles[variant]}`}>{children}</span>
}

function Avatar({ nombre, apellido, size = 'md' }: { nombre: string; apellido: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${s} flex items-center justify-center rounded-full bg-[#EEF0FF] font-semibold text-[#5B5FEF] shrink-0`}>
      {(nombre[0] + (apellido?.[0] || '')).toUpperCase()}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('dashboard')
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [form, setForm] = useState({ nombre: '', apellido: '', cedula: '', telefono: '', direccion: '', email: '' })
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dashVendedorId, setDashVendedorId] = useState<number | null>(null)
  const [dashClientes, setDashClientes] = useState<Cliente[] | null>(null)
  const [modalCliente, setModalCliente] = useState<ClienteDetalle | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)

  const cargarDatos = async () => {
    const r = await fetch('/api/dashboard')
    const d = await r.json()
    if (!d.success) { router.push('/login'); return }
    setVendedores(d.data.vendedores)
    setStats(d.data.stats)
  }

  useEffect(() => { cargarDatos() }, [router])

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
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[220px] flex-col border-r border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B5FEF] text-sm font-bold text-white">P</div>
          <span className="text-base font-bold text-[#111827]">PagoExpress</span>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2 text-sm text-[#6B7280]">
            <Search size={15} />
            <span>Buscar...</span>
          </div>
        </div>

        <nav className="mt-5 flex-1 space-y-1 px-3">
          <SidebarBtn icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <SidebarBtn icon={<Users size={18} />} label="Vendedores" active={view === 'vendedores'} onClick={() => setView('vendedores')} />
          <SidebarBtn icon={<Settings size={18} />} label="Configuración" active={view === 'configuracion'} onClick={() => setView('configuracion')} />
          <SidebarBtn icon={<History size={18} />} label="Auditoría" active={view === 'auditoria'} onClick={() => setView('auditoria')} />
        </nav>

        <div className="border-t border-[#E5E7EB] px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">Accounts</p>
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-[#F7F8FA] cursor-pointer">
            <div className="relative">
              <Avatar nombre="Super" apellido="Admin" size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111827] truncate">Super Admin</p>
              <p className="text-[11px] text-[#6B7280]">superadmin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-[220px] flex-1">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-8 py-3.5">
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span className="text-[#111827] font-medium">Dashboard</span>
            <span className="mx-1">/</span>
            <span>{view === 'dashboard' ? 'Resumen' : view === 'vendedores' ? 'Vendedores' : view === 'configuracion' ? 'Configuración' : view === 'auditoria' ? 'Auditoría' : 'Clientes'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B7280]">{today}</span>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
              <LogOut size={15} />
              Salir
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* ══════ DASHBOARD ══════ */}
          {view === 'dashboard' && (
            <>
              <div className="mb-8">
                <h2 className="text-base font-semibold text-[#111827]">Resumen general</h2>
                <p className="mt-0.5 text-sm text-[#6B7280]">Métrica general del sistema de préstamos</p>
              </div>

              <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  icon={<Building2 size={18} />}
                  iconBg="bg-[#EEF0FF] text-[#5B5FEF]"
                  label="Vendedores activos"
                  value={numberFmt.format(vendedoresActivos)}
                  variacion="+0%"
                  variacionLabel="vs mes anterior"
                />
                <KpiCard
                  icon={<DollarSign size={18} />}
                  iconBg="bg-[#ECFDF5] text-[#10B981]"
                  label="Colocación total"
                  value={moneyFmt.format(colocacion)}
                  variacion={colocacion > 0 ? '+12.5%' : '0%'}
                  variacionLabel="total prestado"
                />
                <KpiCard
                  icon={<CreditCard size={18} />}
                  iconBg="bg-[#EEF0FF] text-[#5B5FEF]"
                  label="Préstamos activos"
                  value="—"
                  variacion="+2.1%"
                  variacionLabel="este mes"
                />
                <KpiCard
                  icon={<AlertTriangle size={18} />}
                  iconBg="bg-[#FEF2F2] text-[#EF4444]"
                  label="Clientes en mora"
                  value={numberFmt.format(atrasados)}
                  variacion={atrasados > 0 ? `+${atrasados}` : '0'}
                  variacionLabel="requieren atención"
                />
              </div>

              {/* ── Alertas de mora ── */}
              {atrasados > 0 && (
                <div className={`rounded-xl border-2 p-5 mb-6 ${
                  atrasados >= 5 ? 'border-[#EF4444] bg-[#FEF2F2]' : 'border-[#F59E0B] bg-[#FFFBEB]'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      atrasados >= 5 ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'
                    }`}>
                      <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-base font-bold ${atrasados >= 5 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                            {atrasados} cliente{atrasados !== 1 ? 's' : ''} en mora
                          </p>
                          <p className="text-sm mt-1 text-[#6B7280]">
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
                        }} className="flex items-center gap-1.5 rounded-lg bg-white border border-[#E5E7EB] px-3.5 py-2 text-sm font-medium text-[#EF4444] hover:bg-[#F7F8FA] transition-colors shadow-sm">
                          <Bell size={15} /> Enviar recordatorios
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
                    <h3 className="text-sm font-semibold text-[#111827]">Vendedores</h3>
                    <button onClick={() => setView('vendedores')} className="text-xs font-medium text-[#5B5FEF] hover:underline">Ver todos</button>
                  </div>
                  <div className="divide-y divide-[#E5E7EB] max-h-[350px] overflow-y-auto">
                    {vendedores.length === 0 ? (
                      <p className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay vendedores registrados</p>
                    ) : (
                      vendedores.map((v) => (
                        <button key={v.id} onClick={() => loadDashClientes(v.id)}
                          className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                            dashVendedorId === v.id ? 'bg-[#EEF0FF]' : 'hover:bg-[#F7F8FA]'
                          }`}>
                          <div className="flex items-center gap-2.5">
                            <Avatar nombre={v.nombre} apellido={v.apellido} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{v.nombre} {v.apellido}</p>
                              <p className="text-xs text-[#6B7280]">{v.total_clientes} clientes</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-[#5B5FEF]">{moneyFmt.format(v.total_prestado)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-3 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                  <div className="border-b border-[#E5E7EB] px-5 py-4">
                    <h3 className="text-sm font-semibold text-[#111827]">
                      {dashClientes ? `Clientes de ${vendedores.find(v => v.id === dashVendedorId)?.nombre || ''}` : 'Clientes'}
                    </h3>
                  </div>
                  {!dashVendedorId ? (
                    <div className="flex items-center justify-center py-16 text-sm text-[#6B7280]">
                      <Users size={20} className="mr-2 opacity-50" />
                      Selecciona un vendedor para ver sus clientes
                    </div>
                  ) : !dashClientes ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" />
                    </div>
                  ) : dashClientes.length === 0 ? (
                    <div className="flex items-center justify-center py-16 text-sm text-[#6B7280]">
                      Este vendedor no tiene clientes
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E5E7EB] max-h-[350px] overflow-y-auto">
                      {dashClientes.map((c) => {
                        const activos = c.prestamosCliente.filter((p) => p.estado === 'activo')
                        const saldo = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
                        const enMora = activos.some((p) => p.diasAtrasados > 0)
                        return (
                          <button key={c.id} onClick={() => openClienteModal(c.id)} className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[#F7F8FA] transition-colors cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-[#111827]">{c.nombre} {c.apellido}</p>
                                <p className="text-xs text-[#6B7280]">{c.cedula}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${enMora ? 'text-[#EF4444]' : 'text-[#111827]'}`}>
                                  {moneyFmt.format(saldo)}
                                </p>
                                <p className="text-xs text-[#6B7280]">{activos.length} préstamo{activos.length !== 1 ? 's' : ''}</p>
                              </div>
                              <ChevronRight size={16} className="text-[#9CA3AF]" />
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
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#111827]">Vendedores</h2>
                  <p className="mt-0.5 text-sm text-[#6B7280]">Gestiona los vendedores del sistema</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href="/api/reportes/vendedores" target="_blank"
                    className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3.5 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                    <FileText size={15} /> Reporte Vendedores
                  </a>
                  <a href="/api/reportes/clientes" target="_blank"
                    className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3.5 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                    <FileText size={15} /> Reporte Clientes
                  </a>
                  <button onClick={() => { setShowVendedorModal(true); setFormMsg(null); setForm({ nombre: '', apellido: '', cedula: '', telefono: '', direccion: '', email: '' }) }} className="flex items-center gap-1.5 rounded-lg bg-[#5B5FEF] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors shadow-sm">
                    <Plus size={15} /> Agregar
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                <div className="border-b border-[#E5E7EB] px-5 py-4">
                  <h3 className="text-sm font-semibold text-[#111827]">Lista de vendedores</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-xs text-[#6B7280]">
                        <th className="px-5 py-3.5 text-left font-medium">Vendedor</th>
                        <th className="px-5 py-3.5 text-left font-medium">Cédula</th>
                        <th className="px-5 py-3.5 text-left font-medium">Contacto</th>
                        <th className="px-5 py-3.5 text-right font-medium">Clientes</th>
                        <th className="px-5 py-3.5 text-right font-medium">Colocación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {vendedores.length === 0 ? (
                        <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay vendedores registrados</td></tr>
                      ) : (
                        vendedores.map((v) => (
                          <tr key={v.id} className="hover:bg-[#F7F8FA] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <Avatar nombre={v.nombre} apellido={v.apellido} />
                                <div>
                                  <p className="font-medium text-[#111827]">{v.nombre} {v.apellido}</p>
                                  <p className="text-xs text-[#6B7280]">{v.email || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs font-mono text-[#6B7280]">{v.cedula}</td>
                            <td className="px-5 py-3.5 text-sm text-[#6B7280]">{v.telefono || '-'}</td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="rounded-full bg-[#EEF0FF] px-2.5 py-0.5 text-xs font-medium text-[#5B5FEF]">{v.total_clientes}</span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-medium text-[#111827]">{moneyFmt.format(v.total_prestado)}</td>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h3 className="text-sm font-semibold text-[#111827]">Crear nuevo vendedor</h3>
              <button onClick={() => { setShowVendedorModal(false); setFormMsg(null) }} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateVendedor} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Nombre *</label>
                  <input placeholder="Nombre" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Apellido</label>
                  <input placeholder="Apellido" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Cédula *</label>
                  <input placeholder="Cédula" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Teléfono</label>
                  <input placeholder="Teléfono" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Email</label>
                  <input placeholder="Email" type="email" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Dirección</label>
                  <input placeholder="Dirección" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors">
                Crear Vendedor
              </button>
              {formMsg && (
                <div className={`rounded-lg p-3 text-sm ${formMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-6 py-4 rounded-t-2xl">
              {modalCliente ? (
                <div className="flex items-center gap-3">
                  <Avatar nombre={modalCliente.nombre} apellido={modalCliente.apellido} />
                  <div>
                    <h2 className="text-lg font-semibold text-[#111827]">{modalCliente.nombre} {modalCliente.apellido}</h2>
                    <p className="text-sm text-[#6B7280]">Cédula: {modalCliente.cedula}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#EEF0FF]" />
                  <div>
                    <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
                    <div className="mt-1 h-3 w-20 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              )}
              <button onClick={() => setModalCliente(null)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                <X size={20} />
              </button>
            </div>

            {modalLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" />
              </div>
            )}

            {modalCliente && (
              <div className="p-6 space-y-6">
                {/* Info del cliente */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <InfoItem icon={<FileText size={14} />} label="Cédula" value={modalCliente.cedula} />
                  <InfoItem icon={<Calendar size={14} />} label="Teléfono" value={modalCliente.telefono || '—'} />
                  <InfoItem icon={<DollarSign size={14} />} label="Email" value={modalCliente.email || '—'} />
                  <InfoItem icon={<TrendingUp size={14} />} label="Dirección" value={modalCliente.direccion || '—'} />
                </div>

                {/* Alertas de mora */}
                {modalCliente.prestamos.some((p) => p.diasAtrasados > 0) && (
                  <div className="rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4">
                    <div className="flex items-center gap-2 text-[#EF4444] font-medium text-sm mb-1">
                      <AlertTriangle size={16} />
                      Cliente en mora
                    </div>
                    <p className="text-xs text-[#B91C1C]">
                      Tiene préstamos con atraso. El cliente debe ponerse al día con sus pagos.
                    </p>
                  </div>
                )}

                {/* Préstamos */}
                <div>
                  <h3 className="text-sm font-semibold text-[#111827] mb-3">Préstamos</h3>
                  {modalCliente.prestamos.length === 0 ? (
                    <p className="text-sm text-[#6B7280]">No tiene préstamos registrados</p>
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
                          <div key={p.id} className={`rounded-xl border p-5 ${
                            p.diasAtrasados > 0 ? 'border-[#FEE2E2] bg-[#FEF2F2]' : 
                            p.estado === 'pagado' ? 'border-[#D1FAE5] bg-[#ECFDF5]' : 'border-[#E5E7EB] bg-white'
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant={p.estado === 'pagado' ? 'success' : p.diasAtrasados > 0 ? 'warning' : 'info'}>
                                  {p.estado === 'pagado' ? 'Pagado' : p.diasAtrasados > 0 ? `${p.diasAtrasados} días atrasado` : 'Activo'}
                                </Badge>
                              </div>
                              <span className="text-xs text-[#6B7280]">{fechaInicio} → {fechaVenc}</span>
                            </div>

                            {/* Montos */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-[#6B7280]">Monto solicitado</p>
                                <p className="text-sm font-semibold text-[#111827]">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[#6B7280]">Total deuda (+{Number(p.tasaInteres)}%)</p>
                                <p className="text-sm font-semibold text-[#111827]">{moneyFmt.format(montoTotal)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[#6B7280]">Monto pagado</p>
                                <p className="text-sm font-semibold text-[#10B981]">{moneyFmt.format(montoPagado)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[#6B7280]">Saldo pendiente</p>
                                <p className="text-sm font-semibold text-[#EF4444]">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                              </div>
                            </div>

                            {/* Detalles */}
                            <div className="grid grid-cols-4 gap-3 text-center mb-4">
                              <DetailChip label="Cuota diaria" value={moneyFmt.format(cuotaDiaria)} />
                              <DetailChip label="Tasa interés" value={`${tasaInteres}%`} />
                              <DetailChip label="Días pagados" value={`${p.diasPagados}/${p.diasPlazo}`} />
                              <DetailChip label="Días restantes" value={`${Math.max(0, diasRestantes)}`} />
                            </div>

                            {/* Barra de progreso */}
                            <div className="mb-4">
                              <div className="flex justify-between text-xs text-[#6B7280] mb-1">
                                <span>Progreso</span>
                                <span>{porcentaje.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-[#E5E7EB]">
                                <div className="h-full rounded-full bg-[#5B5FEF] transition-all" style={{ width: `${Math.min(100, porcentaje)}%` }} />
                              </div>
                            </div>

                            {/* Historial de pagos */}
                            {p.pagos.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-[#111827] mb-2">Pagos recientes ({p.pagos.length})</p>
                                <div className="max-h-32 overflow-y-auto space-y-1.5">
                                  {p.pagos.slice(0, 10).map((pg) => (
                                    <div key={pg.id} className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-xs border border-[#E5E7EB]/50">
                                      <div className="flex items-center gap-2">
                                        {pg.esPagoAtrasado ? (
                                          <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                                        ) : (
                                          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                        )}
                                        <span className="text-[#6B7280]">{new Date(pg.fechaPago).toLocaleDateString('es-CO')}</span>
                                        {pg.observacion && <span className="text-[#9CA3AF] italic">({pg.observacion})</span>}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-[#6B7280]">{pg.diasCubiertos} días</span>
                                        <span className="font-semibold text-[#111827]">{moneyFmt.format(Number(pg.monto))}</span>
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
      active ? 'bg-[#EEF0FF] text-[#5B5FEF] font-semibold' : 'text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827]'
    }`}>
      {icon}
      {label}
    </button>
  )
}

function KpiCard({ icon, iconBg, label, value, variacion, variacionLabel }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string; variacion: string; variacionLabel: string
}) {
  const isPos = !variacion.startsWith('-')
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <Variacion valor={variacion} label={variacion} />
      </div>
      <p className="text-sm text-[#6B7280] mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-[#111827]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{variacionLabel}</p>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] p-3">
      <div className="flex items-center gap-1.5 text-[#6B7280] mb-1">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-medium text-[#111827] truncate">{value}</p>
    </div>
  )
}

function DetailChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#F7F8FA] p-2">
      <p className="text-[10px] text-[#6B7280] mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-[#111827]">{value}</p>
    </div>
  )
}

function ConfigView() {
  const [tasaInteres, setTasaInteres] = useState('20')
  const [cuotaDiaria, setCuotaDiaria] = useState('5000')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTasaInteres(String(Number(d.data.tasaInteres)))
          setCuotaDiaria(String(Number(d.data.cuotaDiariaMinima)))
        }
      })
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasaInteres, cuotaDiariaMinima: cuotaDiaria }),
    })
    const d = await res.json()
    setMsg(d.success ? { ok: true, text: 'Configuración guardada' } : { ok: false, text: d.message })
    setSaving(false)
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#111827]">Configuración del sistema</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Tasa de interés y cuota diaria mínima</p>
      </div>

      <div className="max-w-lg rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#111827]">Parámetros de préstamos</h3>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Tasa de interés (%)</label>
            <input type="number" step="0.01" min="0.01"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]"
              value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} required />
            <p className="mt-1 text-[11px] text-[#6B7280]">Porcentaje de interés aplicado sobre el monto solicitado</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Cuota diaria mínima ($)</label>
            <input type="number" step="100" min="100"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]"
              value={cuotaDiaria} onChange={(e) => setCuotaDiaria(e.target.value)} required />
            <p className="mt-1 text-[11px] text-[#6B7280]">Valor de la cuota diaria base para el cálculo de los días de plazo</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {msg && (
            <div className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
              {msg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{msg.text}</> : <><X size={14} className="inline mr-1" />{msg.text}</>}
            </div>
          )}
        </form>
      </div>
    </>
  )
}

function AuditoriaView() {
  const [registros, setRegistros] = useState<any[]>([])
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

  useEffect(() => { cargar() }, [])

  const money = (n: number) => n.toLocaleString('es-CO')

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#111827]">Auditoría de pagos</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">{total} registro(s) — ediciones y eliminaciones de pagos</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" />
        </div>
      ) : registros.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center text-sm text-[#6B7280]">
          No hay registros de auditoría
        </div>
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-xs text-[#6B7280]">
                <th className="px-5 py-3.5 text-left font-medium">Fecha</th>
                <th className="px-5 py-3.5 text-left font-medium">Usuario</th>
                <th className="px-5 py-3.5 text-left font-medium">Acción</th>
                <th className="px-5 py-3.5 text-left font-medium">Detalles</th>
                <th className="px-5 py-3.5 text-left font-medium">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {registros.map((r) => {
                let detalles: any = {}
                try { detalles = JSON.parse(r.detalles || '{}') } catch { }
                const esEliminar = r.accion === 'eliminar_pago'
                return (
                  <tr key={r.id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#6B7280]">
                      {new Date(r.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-medium text-[#111827]">{r.usuario.nombre} {r.usuario.apellido}</span>
                      <span className="text-[10px] text-[#6B7280] ml-1">({r.usuario.rol})</span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        esEliminar ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#FFFBEB] text-[#F59E0B]'
                      }`}>
                        {esEliminar ? 'Eliminación' : 'Edición'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280]">
                      {detalles.anterior && (
                        <div>
                          <span className="text-[#9CA3AF]">Anterior: </span>
                          <span className="font-mono">${money(detalles.anterior.monto)}</span>
                          {detalles.anterior.fecha && (
                            <span className="text-[#9CA3AF] ml-1">
                              ({new Date(detalles.anterior.fecha).toLocaleDateString('es-CO')})
                            </span>
                          )}
                        </div>
                      )}
                      {detalles.nuevo && (
                        <div>
                          <span className="text-[#10B981]">Nuevo: </span>
                          <span className="font-mono">${money(detalles.nuevo.monto)}</span>
                          {detalles.nuevo.fecha && (
                            <span className="text-[#10B981] ml-1">
                              ({new Date(detalles.nuevo.fecha).toLocaleDateString('es-CO')})
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280] italic max-w-[200px] truncate">
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
