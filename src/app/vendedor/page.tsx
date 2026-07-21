'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, DollarSign, LogOut, Plus, Search,
  TrendingUp, CheckCircle2, X, AlertTriangle, Phone, Mail, MapPin,
  Calendar, ArrowRight, ChevronRight, Banknote, Clock, BadgeCheck, Bell,
} from 'lucide-react'
import { Tooltip, InfoTip } from '@/components/Tooltip'

const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

type Prestamo = {
  id: number; montoSolicitado: string; montoTotal: string; montoPagado: string
  saldoPendiente: string; cuotaDiaria: string; estado: string; diasPlazo: number
  fechaInicio: string; fechaFinEsperada: string; fechaUltimoPago: string | null
  diasAtrasados: number; diasPagados: number
  cliente: { nombre: string; apellido: string; cedula: string }
  pagos?: { id: number; monto: string; fechaPago: string; diasCubiertos: number }[]
}

type Cliente = {
  id: number; cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null; direccion: string | null
  prestamosCliente: {
    id: number; estado: string; montoSolicitado: string; montoPagado: string
    saldoPendiente: string; cuotaDiaria: string; diasAtrasados: number
    diasPlazo: number; diasPagados: number; fechaInicio: string; montoTotal: string
    pagos?: { id: number; monto: string; fechaPago: string; diasCubiertos: number; esPagoAtrasado: number }[]
  }[]
}

type Stats = {
  total_prestamos: number; activos: number; pagados: number
  monto_prestado: number; monto_recuperado: number; saldo_pendiente: number
  total_clientes: number
}

type View = 'dashboard' | 'clientes' | 'prestamos' | 'pagos'

function Avatar({ nombre, apellido, size = 'md' }: { nombre: string; apellido: string; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${s} flex items-center justify-center rounded-full bg-[#EEF0FF] font-semibold text-[#5B5FEF] shrink-0`}>
      {(nombre[0] + (apellido?.[0] || '')).toUpperCase()}
    </div>
  )
}

function BadgeEstado({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    activo: 'bg-[#EEF0FF] text-[#5B5FEF]',
    pagado: 'bg-[#ECFDF5] text-[#10B981]',
    cancelado: 'bg-[#FEF2F2] text-[#EF4444]',
  }
  const labels: Record<string, string> = { activo: 'Activo', pagado: 'Pagado', cancelado: 'Cancelado' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
      {labels[estado] || estado}
    </span>
  )
}

function yaPagoHoy(prestamo: { pagos?: { fechaPago: string }[] }): boolean {
  const hoy = new Date()
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  return (prestamo.pagos || []).some((pg) => {
    const f = new Date(pg.fechaPago)
    const pgStr = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
    return pgStr === hoyStr
  })
}

export default function VendedorPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('dashboard')
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [selectedPrestamo, setSelectedPrestamo] = useState<Prestamo | null>(null)
  const [loading, setLoading] = useState(true)

  const cargarDashboard = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dashboard')
      const d = await r.json()
      if (!d.success) { router.push('/login'); return }
      setPrestamos(d.data.prestamos || [])
      setStats(d.data.stats || null)
      setClientes(d.data.clientes || [])
    } catch { }
    setLoading(false)
  }

  const cargarClientes = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/clientes?resumen=true')
      const d = await r.json()
      if (d.success) setClientes(d.data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => {
    if (view === 'dashboard') cargarDashboard()
    else if (view === 'clientes') cargarClientes()
    else if (view === 'prestamos') cargarClientes()
  }, [view, router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-[220px] flex-col border-r border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2.5 border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B5FEF] text-sm font-bold text-white">P</div>
          <span className="text-base font-bold text-[#111827]">PagoExpress</span>
        </div>

        <nav className="mt-5 flex-1 space-y-1 px-3">
          <SidebarBtn icon={<LayoutDashboard size={18} />} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setSelectedCliente(null) }} />
          <SidebarBtn icon={<Users size={18} />} label="Clientes" active={view === 'clientes'} onClick={() => { setView('clientes'); setSelectedCliente(null) }} />
          <SidebarBtn icon={<CreditCard size={18} />} label="Préstamos" active={view === 'prestamos'} onClick={() => setView('prestamos')} />
          <SidebarBtn icon={<DollarSign size={18} />} label="Pagos" active={view === 'pagos'} onClick={() => setView('pagos')} />
        </nav>

        <div className="border-t border-[#E5E7EB] px-3 py-4">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="relative">
              <Avatar nombre="V" apellido="" size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#10B981]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#111827] truncate">Mi cuenta</p>
              <p className="text-[11px] text-[#6B7280]">Vendedor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="ml-[220px] flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-8 py-3.5">
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span className="text-[#111827] font-medium">Vendedor</span>
            <span className="mx-1">/</span>
            <span>{view === 'dashboard' ? 'Resumen' : view === 'clientes' ? 'Clientes' : view === 'prestamos' ? 'Préstamos' : 'Pagos'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B7280]">{today}</span>
            <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
              <LogOut size={15} /> Salir
            </button>
          </div>
        </header>

        <div className="p-8">
          {view === 'dashboard' && <DashboardView stats={stats} prestamos={prestamos} loading={loading} />}
          {view === 'clientes' && (
            <ClientesView
              clientes={clientes} selectedCliente={selectedCliente} setSelectedCliente={setSelectedCliente}
              selectedPrestamo={selectedPrestamo} setSelectedPrestamo={setSelectedPrestamo}
              loading={loading} cargarClientes={cargarClientes} setPrestamos={setPrestamos}
            />
          )}
          {view === 'prestamos' && <PrestamosView clientes={clientes} cargarPrestamos={cargarDashboard} />}
          {view === 'pagos' && <PagosView />}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════ DASHBOARD VIEW ═══════════════════════════ */

function DashboardView({ stats, prestamos, loading }: { stats: Stats | null; prestamos: Prestamo[]; loading: boolean }) {
  const [selectedPrestamoId, setSelectedPrestamoId] = useState<number | null>(null)

  async function handleCobrar(prestamo: Prestamo, montoExtra?: number) {
    const monto = montoExtra || Number(prestamo.cuotaDiaria)
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prestamo_id: prestamo.id, monto }),
    })
    const data = await res.json()
    if (data.success) {
      window.location.reload()
    } else {
      alert('Error: ' + data.message)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" /></div>

  const prestamosPorCliente = new Map<string, { cliente: { nombre: string; apellido: string; cedula: string }; prestamos: Prestamo[] }>()
  prestamos.forEach(p => {
    const key = p.cliente.cedula
    if (!prestamosPorCliente.has(key)) {
      prestamosPorCliente.set(key, { cliente: p.cliente, prestamos: [] })
    }
    prestamosPorCliente.get(key)!.prestamos.push(p)
  })

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#111827]">Resumen de cobros</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Vista general de tus clientes y préstamos</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard icon={<CreditCard size={16} />} iconBg="bg-[#EEF0FF] text-[#5B5FEF]" label="Activos" value={String(stats?.activos ?? 0)} tip="Cantidad de préstamos que están en curso y aún no se han pagado completamente" />
        <StatCard icon={<DollarSign size={16} />} iconBg="bg-[#ECFDF5] text-[#10B981]" label="Recuperado" value={stats ? moneyFmt.format(stats.monto_recuperado) : '$0'} color="text-[#10B981]" tip="Dinero total que tus clientes ya han pagado" />
        <StatCard icon={<TrendingUp size={16} />} iconBg="bg-[#FFFBEB] text-[#F59E0B]" label="Pendiente" value={stats ? moneyFmt.format(stats.saldo_pendiente) : '$0'} color="text-[#F59E0B]" tip="Dinero que aún te deben los clientes por pagar" />
        <StatCard icon={<Users size={16} />} iconBg="bg-[#EEF0FF] text-[#5B5FEF]" label="Clientes" value={String(stats?.total_clientes ?? 0)} tip="Total de clientes que tienes asignados" />
      </div>

      {(() => {
        const enMora = prestamos.filter(p => p.diasAtrasados > 0)
        if (enMora.length === 0) return null
        const maxDias = Math.max(...enMora.map(p => p.diasAtrasados))
        return (
          <div className={`rounded-xl border-2 p-4 mb-6 ${maxDias >= 7 ? 'border-[#EF4444] bg-[#FEF2F2]' : 'border-[#F59E0B] bg-[#FFFBEB]'}`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${maxDias >= 7 ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}>
                <AlertTriangle size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-bold ${maxDias >= 7 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                      {enMora.length} cliente{enMora.length !== 1 ? 's' : ''} con atraso
                    </p>
                    <p className="text-xs mt-0.5 text-[#6B7280]">
                      {maxDias >= 7 ? 'Hay clientes con mora severa. Envía recordatorios urgentes.' : `Máximo atraso: ${maxDias} días`}
                    </p>
                  </div>
                  <button onClick={async () => {
                    try {
                      const r = await fetch('/api/recordatorios', { method: 'POST' })
                      const d = await r.json()
                      alert(d.message || 'Recordatorios enviados')
                    } catch { alert('Error al enviar recordatorios') }
                  }} className="flex items-center gap-1.5 rounded-lg bg-white border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium text-[#EF4444] hover:bg-[#F7F8FA] transition-colors shadow-sm">
                    <Bell size={13} /> Recordatorios
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {prestamos.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-[#6B7280]">No hay préstamos registrados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(prestamosPorCliente.values()).map(({ cliente, prestamos: ps }) => {
            const activos = ps.filter(p => p.estado === 'activo')
            const maxDiasAtraso = Math.max(0, ...activos.map(p => p.diasAtrasados))
            const saldoTotal = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
            const pagadoTotal = ps.reduce((s, p) => s + Number(p.montoPagado), 0)

            return (
              <div key={cliente.cedula} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
                {/* Header del cliente */}
                <div className={`flex items-center justify-between px-5 py-4 ${
                  maxDiasAtraso >= 7 ? 'bg-[#FEF2F2] border-b-2 border-[#EF4444]' :
                  maxDiasAtraso > 0 ? 'bg-[#FFFBEB] border-b-2 border-[#F59E0B]' :
                  'bg-[#F7F8FA] border-b border-[#E5E7EB]'
                }`}>
                  <div className="flex items-center gap-3">
                    <Avatar nombre={cliente.nombre} apellido={cliente.apellido} />
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{cliente.nombre} {cliente.apellido}</p>
                      <p className="text-xs text-[#6B7280]">{cliente.cedula}</p>
                    </div>
                    {maxDiasAtraso > 0 && (
                      <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        maxDiasAtraso >= 7 ? 'bg-[#EF4444] text-white' : 'bg-[#F59E0B] text-white'
                      }`}>
                        <AlertTriangle size={11} /> {maxDiasAtraso}d atraso
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B7280]">Saldo: <span className="font-semibold text-[#F59E0B]">{moneyFmt.format(saldoTotal)}</span></p>
                    <p className="text-xs text-[#6B7280]">Pagado: <span className="font-semibold text-[#10B981]">{moneyFmt.format(pagadoTotal)}</span></p>
                  </div>
                </div>

                {/* Préstamos del cliente */}
                <div className="divide-y divide-[#E5E7EB]">
                  {ps.map((p) => {
                    const pct = Number(p.montoSolicitado) > 0 ? Math.round((Number(p.montoPagado) / Number(p.montoSolicitado)) * 100) : 0
                    const montoConInteres = Number(p.montoSolicitado) * 1.20
                    const cuotasRestantes = Math.max(0, p.diasPlazo - p.diasPagados)
                    const saldoAtrasado = p.diasAtrasados > 0 ? Number(p.cuotaDiaria) * p.diasAtrasados : 0
                    const fechaInicio = new Date(p.fechaInicio)
                    const fechaFin = new Date(fechaInicio)
                    fechaFin.setDate(fechaFin.getDate() + p.diasPlazo)
                    const isSelected = selectedPrestamoId === p.id

                    return (
                      <div key={p.id} className={`transition-colors ${isSelected ? 'bg-[#EEF0FF]/30' : ''}`}>
                        {/* Fila resumen (clickeable) */}
                        <button onClick={() => setSelectedPrestamoId(isSelected ? null : p.id)}
                          className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-[#F7F8FA] transition-colors text-left">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                              p.estado === 'pagado' ? 'bg-[#ECFDF5] text-[#10B981]' :
                              p.diasAtrasados > 0 ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#EEF0FF] text-[#5B5FEF]'
                            }`}>
                              {p.estado === 'pagado' ? <CheckCircle2 size={13} /> : `${p.diasPagados}/${p.diasPlazo}`}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-[#111827]">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                              <p className="text-[11px] text-[#6B7280]">{pct}% pagado · {cuotasRestantes} días restantes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <BadgeEstado estado={p.estado} />
                            {p.diasAtrasados > 0 && (
                              <span className="text-[11px] font-semibold text-[#EF4444]">{p.diasAtrasados}d atraso</span>
                            )}
                            <ChevronRight size={16} className={`text-[#6B7280] transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          </div>
                        </button>

                        {/* Panel expandido */}
                        {isSelected && (
                          <div className="border-t border-[#E5E7EB] px-5 py-4 bg-[#F9FAFB] space-y-4">
                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="flex items-center gap-1.5 text-[#6B7280]">
                                <Calendar size={11} />
                                <span>Inicio: {fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#6B7280]">
                                <Calendar size={11} />
                                <span>Fin: {fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>

                            {/* Resumen financiero */}
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="rounded-lg bg-white p-3 border border-[#E5E7EB]">
                                <p className="text-[#6B7280] flex items-center gap-1">Monto + interés <InfoTip text="El dinero prestado más el interés calculado. Es lo que el cliente debe en total." /></p>
                                <p className="font-semibold text-[#111827]">{moneyFmt.format(montoConInteres)}</p>
                              </div>
                              <div className="rounded-lg bg-white p-3 border border-[#E5E7EB]">
                                <p className="text-[#6B7280] flex items-center gap-1">Cuota diaria <InfoTip text="Cantidad que el cliente debe pagar cada día para cubrir el préstamo." /></p>
                                <p className="font-semibold text-[#111827]">{moneyFmt.format(Number(p.cuotaDiaria))}</p>
                              </div>
                              <div className="rounded-lg bg-white p-3 border border-[#E5E7EB]">
                                <p className="text-[#6B7280] flex items-center gap-1">Saldo restante <InfoTip text="Dinero que falta por pagar del préstamo. Baja cada vez que el cliente paga." /></p>
                                <p className="font-semibold text-[#F59E0B]">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                              </div>
                              <div className="rounded-lg bg-white p-3 border border-[#E5E7EB]">
                                <p className="text-[#6B7280] flex items-center gap-1">Cuotas por pagar <InfoTip text="Días que quedan para terminar de pagar el préstamo." /></p>
                                <p className="font-semibold text-[#111827]">{cuotasRestantes} de {p.diasPlazo}</p>
                              </div>
                            </div>

                            {/* Barra de progreso */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-[#6B7280] flex items-center gap-1">Progreso <InfoTip text="Porcentaje del préstamo que ya fue pagado. Cuando llega a 100%, el préstamo está completo." /></span>
                                <span className="text-[11px] font-medium text-[#5B5FEF]">{pct}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                                <div className={`h-full rounded-full transition-all ${p.diasAtrasados > 0 ? 'bg-[#F59E0B]' : 'bg-[#5B5FEF]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-[#6B7280]">{p.diasPagados} días pagados</span>
                                <span className="text-[10px] text-[#6B7280]">Quedan {cuotasRestantes} días</span>
                              </div>
                            </div>

                            {/* Alerta de atraso */}
                            {p.diasAtrasados > 0 && (
                              <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3">
                                <p className="text-[11px] font-medium text-[#EF4444]">
                                  Debe {p.diasAtrasados} día{p.diasAtrasados !== 1 ? 's' : ''} = {moneyFmt.format(saldoAtrasado)}
                                </p>
                                <p className="text-[10px] text-[#6B7280] mt-0.5">
                                  Pague {moneyFmt.format(saldoAtrasado + Number(p.cuotaDiaria))} para cubrir el atraso y la cuota de hoy.
                                </p>
                              </div>
                            )}

                            {p.estado === 'pagado' && (
                              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#ECFDF5] px-3 py-2.5 text-xs font-medium text-[#10B981]">
                                <BadgeCheck size={13} /> Préstamo completado
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ── Botón único de cobro por cliente ── */}
                  {(() => {
                    const activos = ps.filter(p => p.estado === 'activo')
                    if (activos.length === 0) return null

                    const totalCuotaDiaria = activos.reduce((s, p) => s + Number(p.cuotaDiaria), 0)
                    const maxDiasAtrasoLocal = Math.max(0, ...activos.map(p => p.diasAtrasados))
                    const totalSaldoAtrasado = activos.reduce((s, p) => s + (p.diasAtrasados > 0 ? Number(p.cuotaDiaria) * p.diasAtrasados : 0), 0)
                    const totalSaldoHoy = totalSaldoAtrasado + totalCuotaDiaria
                    const todosPagaronHoy = activos.every(p => yaPagoHoy(p))
                    const esPrimerDia = activos.every(p => p.diasPagados === 0 && p.diasAtrasados === 0)

                    return (
                      <div className="px-5 py-4 border-t border-[#E5E7EB]">
                        {todosPagaronHoy || esPrimerDia ? (
                          <Tooltip text={esPrimerDia ? 'El préstamo fue creado hoy. El primer cobro se hace mañana.' : 'Este cliente ya pagó la cuota de hoy. No hay nada que cobrar.'}>
                            <div className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E5E7EB] px-3 py-3 text-sm font-medium text-[#9CA3AF] cursor-not-allowed">
                              <Clock size={14} /> {esPrimerDia ? 'Primer día — cobra mañana' : 'Ya cobró hoy'}
                            </div>
                          </Tooltip>
                        ) : maxDiasAtrasoLocal > 0 ? (
                          <Tooltip text={`Registra el pago del cliente para cubrir ${maxDiasAtrasoLocal} día(s) de atraso más la cuota de hoy. El saldo atrasado es ${moneyFmt.format(totalSaldoAtrasado)}.`}>
                            <button onClick={() => handleCobrar(activos[0], totalSaldoHoy)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#EF4444] px-3 py-3 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors">
                              <AlertTriangle size={14} /> Ponerse al día ({moneyFmt.format(totalSaldoHoy)})
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip text={`Registra el cobro de la cuota diaria de este cliente. Se descontará del saldo pendiente del préstamo.`}>
                            <button onClick={() => handleCobrar(activos[0], totalCuotaDiaria)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#5B5FEF] px-3 py-3 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors">
                              <Banknote size={14} /> Cobrar cuota ({moneyFmt.format(totalCuotaDiaria)})
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════ CLIENTES VIEW ═══════════════════════════ */

function ClientesView({
  clientes, selectedCliente, setSelectedCliente, selectedPrestamo, setSelectedPrestamo,
  loading, cargarClientes, setPrestamos,
}: {
  clientes: Cliente[]; selectedCliente: Cliente | null; setSelectedCliente: (c: Cliente | null) => void
  selectedPrestamo: Prestamo | null; setSelectedPrestamo: (p: Prestamo | null) => void
  loading: boolean; cargarClientes: () => Promise<void>; setPrestamos: (p: Prestamo[]) => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ cedula: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '' })
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [pagoEditando, setPagoEditando] = useState<any>(null)
  const [pagoEliminando, setPagoEliminando] = useState<any>(null)
  const [pagoMotivo, setPagoMotivo] = useState('')
  const [pagoMontoEdit, setPagoMontoEdit] = useState('')
  const [pagoFechaEdit, setPagoFechaEdit] = useState('')
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoMsg, setPagoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [editandoCliente, setEditingCliente] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', telefono: '', email: '', direccion: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const clientesFiltrados = buscar
    ? clientes.filter(c => `${c.nombre} ${c.apellido} ${c.cedula}`.toLowerCase().includes(buscar.toLowerCase()))
    : clientes

  async function handleCreateCliente(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormMsg(null)
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.success) {
      setForm({ cedula: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '' })
      await cargarClientes()
      setShowModal(false)
      setFormMsg(null)
    } else {
      setFormMsg({ ok: false, text: data.message })
    }
    setSaving(false)
  }

  function openEditPago(pg: any) {
    setPagoEditando(pg)
    setPagoMontoEdit(String(Number(pg.monto)))
    const f = new Date(pg.fechaPago)
    setPagoFechaEdit(f.toISOString().slice(0, 16))
    setPagoMotivo('')
    setPagoMsg(null)
  }

  async function handleEditPago() {
    if (!pagoEditando || !pagoMotivo.trim()) return
    setPagoSaving(true)
    setPagoMsg(null)
    const res = await fetch('/api/pagos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pago_id: pagoEditando.id,
        monto: Number(pagoMontoEdit),
        fechaPago: pagoFechaEdit ? new Date(pagoFechaEdit).toISOString() : undefined,
        motivo: pagoMotivo.trim(),
      }),
    })
    const d = await res.json()
    if (d.success) {
      setPagoEditando(null)
      setPagoMsg(null)
      await cargarClientes()
      if (selectedCliente) {
        const r = await fetch(`/api/clientes?id=${selectedCliente.id}`)
        const rd = await r.json()
        if (rd.success) setSelectedCliente({ ...selectedCliente, ...rd.data, prestamosCliente: rd.data.prestamos || [] })
      }
    } else {
      setPagoMsg({ ok: false, text: d.message })
    }
    setPagoSaving(false)
  }

  function openDeletePago(pg: any) {
    setPagoEliminando(pg)
    setPagoMotivo('')
    setPagoMsg(null)
  }

  async function handleDeletePago() {
    if (!pagoEliminando || !pagoMotivo.trim()) return
    setPagoSaving(true)
    setPagoMsg(null)
    const res = await fetch('/api/pagos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pago_id: pagoEliminando.id, motivo: pagoMotivo.trim() }),
    })
    const d = await res.json()
    if (d.success) {
      setPagoEliminando(null)
      setPagoMsg(null)
      await cargarClientes()
      if (selectedCliente) {
        const r = await fetch(`/api/clientes?id=${selectedCliente.id}`)
        const rd = await r.json()
        if (rd.success) setSelectedCliente({ ...selectedCliente, ...rd.data, prestamosCliente: rd.data.prestamos || [] })
      }
    } else {
      setPagoMsg({ ok: false, text: d.message })
    }
    setPagoSaving(false)
  }

  function openEditCliente() {
    if (!selectedCliente) return
    setEditForm({
      nombre: selectedCliente.nombre,
      apellido: selectedCliente.apellido || '',
      telefono: selectedCliente.telefono || '',
      email: selectedCliente.email || '',
      direccion: selectedCliente.direccion || '',
    })
    setEditMsg(null)
    setEditingCliente(true)
  }

  async function handleEditCliente() {
    if (!selectedCliente) return
    setEditSaving(true)
    setEditMsg(null)
    const res = await fetch('/api/clientes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedCliente.id, ...editForm }),
    })
    const d = await res.json()
    if (d.success) {
      setSelectedCliente({ ...selectedCliente, ...d.data, prestamosCliente: selectedCliente.prestamosCliente || [] })
      setEditingCliente(false)
      setEditMsg(null)
      await cargarClientes()
    } else {
      setEditMsg({ ok: false, text: d.message })
    }
    setEditSaving(false)
  }

  async function selectCliente(c: Cliente) {
    setDetailLoading(true)
    setSelectedPrestamo(null)
    try {
      const r = await fetch(`/api/clientes?id=${c.id}`)
      const d = await r.json()
      if (d.success) {
        setSelectedCliente({ ...c, ...d.data, prestamosCliente: d.data.prestamos || [] })
      }
    } catch { }
    setDetailLoading(false)
  }

  async function handleCobrar(prestamo: Prestamo, montoExtra?: number) {
    const monto = montoExtra || Number(prestamo.cuotaDiaria)
    const res = await fetch('/api/pagos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prestamo_id: prestamo.id, monto }),
    })
    const data = await res.json()
    if (data.success) {
      await cargarClientes()
      if (selectedCliente) {
        const r = await fetch(`/api/clientes?id=${selectedCliente.id}`)
        const d = await r.json()
        if (d.success) setSelectedCliente({ ...selectedCliente, ...d.data, prestamosCliente: d.data.prestamos || [] })
      }
    } else {
      alert('Error: ' + data.message)
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#111827]">Mis clientes</h2>
          <p className="mt-0.5 text-sm text-[#6B7280]">Gestiona tus clientes y sus préstamos</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormMsg(null); setForm({ cedula: '', nombre: '', apellido: '', telefono: '', email: '', direccion: '' }) }} className="flex items-center gap-1.5 rounded-lg bg-[#5B5FEF] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors shadow-sm">
          <Plus size={15} /> Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* ── Left: Lista de clientes ── */}
        <div className="lg:col-span-2 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2">
              <Search size={15} className="text-[#6B7280] shrink-0" />
              <input placeholder="Buscar cliente..." className="bg-transparent text-sm outline-none w-full" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
          </div>
          <div className="divide-y divide-[#E5E7EB] max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" /></div>
            ) : clientesFiltrados.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay clientes</p>
            ) : (
              clientesFiltrados.map((c) => {
                const activos = c.prestamosCliente.filter(p => p.estado === 'activo')
                const saldo = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
                const enMora = activos.some(p => p.diasAtrasados > 0)
                return (
                  <button key={c.id} onClick={() => selectCliente(c)}
                    className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                      selectedCliente?.id === c.id ? 'bg-[#EEF0FF]' : 'hover:bg-[#F7F8FA]'
                    }`}>
                    <div className="flex items-center gap-2.5">
                      <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{c.nombre} {c.apellido}</p>
                        <p className="text-xs text-[#6B7280]">{c.cedula}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-semibold ${enMora ? 'text-[#EF4444]' : saldo > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                        {saldo > 0 ? moneyFmt.format(saldo) : 'Al día'}
                      </p>
                      <p className="text-[11px] text-[#6B7280]">{activos.length} préstamo{activos.length !== 1 ? 's' : ''}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: Detalle del cliente ── */}
        <div className="lg:col-span-3 rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#111827]">
              {selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido}` : 'Detalle del cliente'}
            </h3>
          </div>
          {!selectedCliente ? (
            <div className="flex flex-col items-center justify-center py-16 text-sm text-[#6B7280]">
              <Users size={24} className="mb-2 opacity-50" />
              Selecciona un cliente para ver sus datos
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" /></div>
          ) : (
            <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* ── Alerta de mora ── */}
              {(() => {
                const activos = (selectedCliente.prestamosCliente || []).filter(p => p.estado === 'activo')
                const maxDiasAtraso = Math.max(0, ...activos.map(p => p.diasAtrasados))
                if (maxDiasAtraso <= 0) return null
                const montoAtrasado = activos.filter(p => p.diasAtrasados > 0).reduce((s, p) => s + Number(p.cuotaDiaria) * p.diasAtrasados, 0)
                return (
                  <div className={`rounded-xl border-2 p-4 ${
                    maxDiasAtraso >= 7 ? 'border-[#EF4444] bg-[#FEF2F2]' :
                    maxDiasAtraso >= 3 ? 'border-[#F59E0B] bg-[#FFFBEB]' :
                    'border-[#F59E0B] bg-[#FFFBEB]'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        maxDiasAtraso >= 7 ? 'bg-[#EF4444] text-white' : 'bg-[#F59E0B] text-white'
                      }`}>
                        <AlertTriangle size={16} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          maxDiasAtraso >= 7 ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                        }`}>
                          {maxDiasAtraso >= 7 ? 'ALERTA: Cliente en mora severa' :
                           maxDiasAtraso >= 3 ? 'AVISO: Cliente con atraso notable' :
                           'AVISO: Cliente con pequeño atraso'}
                        </p>
                        <p className="text-xs mt-1 text-[#6B7280]">
                          {maxDiasAtraso} día{maxDiasAtraso !== 1 ? 's' : ''} sin pago.
                          Debería pagar al menos {moneyFmt.format(montoAtrasado)} para ponerse al día.
                        </p>
                        {maxDiasAtraso >= 7 && (
                          <p className="text-xs mt-1.5 font-medium text-[#EF4444]">
                            Considera contactar al cliente para establecer un plan de pago.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* ── Info del cliente ── */}
              <div className="flex items-start gap-4">
                <Avatar nombre={selectedCliente.nombre} apellido={selectedCliente.apellido} size="md" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#111827]">{selectedCliente.nombre} {selectedCliente.apellido}</p>
                    <button onClick={openEditCliente} className="flex items-center gap-1 rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-xs font-medium text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#5B5FEF] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      Editar
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                    <span className="flex items-center gap-1"><CreditCard size={12} /> {selectedCliente.cedula}</span>
                    {selectedCliente.telefono && <span className="flex items-center gap-1"><Phone size={12} /> {selectedCliente.telefono}</span>}
                  </div>
                  {selectedCliente.email && <p className="flex items-center gap-1 text-xs text-[#6B7280]"><Mail size={12} /> {selectedCliente.email}</p>}
                  {selectedCliente.direccion && <p className="flex items-center gap-1 text-xs text-[#6B7280]"><MapPin size={12} /> {selectedCliente.direccion}</p>}
                </div>
              </div>

              {/* ── Resumen financiero ── */}
              {(() => {
                const todos = selectedCliente.prestamosCliente || []
                const activos = todos.filter(p => p.estado === 'activo')
                const totalPagado = activos.reduce((s, p) => s + Number(p.montoPagado), 0)
                const saldoTotal = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
                const montoTotalPrestado = todos.reduce((s, p) => s + Number(p.montoSolicitado), 0)
                const maxDiasAtraso = Math.max(0, ...activos.map(p => p.diasAtrasados))
                const totalDiasAtraso = activos.reduce((s, p) => s + p.diasAtrasados, 0)
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#ECFDF5] p-3">
                      <p className="text-[11px] font-medium text-[#10B981] flex items-center gap-1">Total pagado <InfoTip text="Suma de todos los pagos que el cliente ha hecho en sus préstamos." /></p>
                      <p className="text-sm font-bold text-[#10B981]">{moneyFmt.format(totalPagado)}</p>
                    </div>
                    <div className="rounded-lg bg-[#FFFBEB] p-3">
                      <p className="text-[11px] font-medium text-[#F59E0B] flex items-center gap-1">Saldo pendiente <InfoTip text="Dinero que el cliente aún debe. Baja con cada pago que haga." /></p>
                      <p className="text-sm font-bold text-[#F59E0B]">{moneyFmt.format(saldoTotal)}</p>
                    </div>
                    <div className="rounded-lg bg-[#EEF0FF] p-3">
                      <p className="text-[11px] font-medium text-[#5B5FEF] flex items-center gap-1">Total prestado <InfoTip text="Dinero total que se le ha prestado al cliente en todos sus préstamos." /></p>
                      <p className="text-sm font-bold text-[#5B5FEF]">{moneyFmt.format(montoTotalPrestado)}</p>
                    </div>
                    <div className={`rounded-lg p-3 ${maxDiasAtraso > 0 ? 'bg-[#FEF2F2]' : 'bg-[#ECFDF5]'}`}>
                      <p className={`text-[11px] font-medium ${maxDiasAtraso > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {maxDiasAtraso > 0 ? 'Máx. atraso' : 'Estado'}
                      </p>
                      <p className={`text-sm font-bold ${maxDiasAtraso > 0 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                        {maxDiasAtraso > 0 ? `${maxDiasAtraso} días` : 'Al día'}
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* ── Préstamos detallados ── */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Préstamos</h4>
                {(selectedCliente.prestamosCliente || []).length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Sin préstamos registrados</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedCliente.prestamosCliente || []).map((p) => {
                      const pct = Number(p.montoSolicitado) > 0 ? Math.round((Number(p.montoPagado) / Number(p.montoSolicitado)) * 100) : 0
                      const montoConInteres = Number(p.montoSolicitado) * 1.20
                      const cuotasRestantes = Math.max(0, p.diasPlazo - p.diasPagados)
                      const saldoAtrasado = p.diasAtrasados > 0 ? Number(p.cuotaDiaria) * p.diasAtrasados : 0
                      const fechaInicio = new Date(p.fechaInicio)
                      const fechaFin = new Date(fechaInicio)
                      fechaFin.setDate(fechaFin.getDate() + p.diasPlazo)
                      const pagos = (p as any).pagos || []
                      const fechaUltimoPago = pagos.length > 0 ? new Date(pagos[0].fechaPago) : null

                      return (
                        <div key={p.id} className={`rounded-xl border p-4 ${
                          p.diasAtrasados >= 7 ? 'border-[#EF4444] bg-[#FEF2F2]/30' :
                          p.diasAtrasados > 0 ? 'border-[#F59E0B] bg-[#FFFBEB]/30' :
                          'border-[#E5E7EB] bg-white'
                        }`}>
                          {/* Header del préstamo */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#111827]">{moneyFmt.format(Number(p.montoSolicitado))}</span>
                              <BadgeEstado estado={p.estado} />
                            </div>
                            {p.diasAtrasados > 0 && (
                              <span className="flex items-center gap-1 rounded-full bg-[#EF4444] px-2 py-0.5 text-[11px] font-semibold text-white">
                                <AlertTriangle size={10} /> {p.diasAtrasados}d atraso
                              </span>
                            )}
                          </div>

                          {/* Fechas */}
                          <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[#6B7280]">
                              <Calendar size={11} />
                              <span>Inicio: {fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[#6B7280]">
                              <Calendar size={11} />
                              <span>Fin: {fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>

                          {/* Resumen financiero del préstamo */}
                          <div className="mb-3 rounded-lg bg-[#F7F8FA] p-3 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-[#6B7280] flex items-center gap-1">Monto + interés <InfoTip text="El dinero prestado más el interés. Es el total que debe pagar el cliente." /></p>
                              <p className="font-semibold text-[#111827]">{moneyFmt.format(montoConInteres)}</p>
                            </div>
                            <div>
                              <p className="text-[#6B7280] flex items-center gap-1">Cuota diaria <InfoTip text="Cuánto debe pagar el cliente cada día." /></p>
                              <p className="font-semibold text-[#111827]">{moneyFmt.format(Number(p.cuotaDiaria))}</p>
                            </div>
                            <div>
                              <p className="text-[#6B7280] flex items-center gap-1">Saldo restante <InfoTip text="Lo que falta por pagar. Con cada pago, este monto baja." /></p>
                              <p className="font-semibold text-[#F59E0B]">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                            </div>
                            <div>
                              <p className="text-[#6B7280] flex items-center gap-1">Cuotas por pagar <InfoTip text="Días que quedan para terminar de pagar." /></p>
                              <p className="font-semibold text-[#111827]">{cuotasRestantes} de {p.diasPlazo}</p>
                            </div>
                          </div>

                          {/* Barra de progreso */}
                          <div className="mb-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-[#6B7280] flex items-center gap-1">Progreso <InfoTip text="Porcentaje pagado del préstamo. Al llegar a 100%, el préstamo queda completo." /></span>
                              <span className="text-[11px] font-medium text-[#5B5FEF]">{pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                              <div className={`h-full rounded-full transition-all ${
                                p.diasAtrasados > 0 ? 'bg-[#F59E0B]' : 'bg-[#5B5FEF]'
                              }`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-[#6B7280]">{p.diasPagados} días pagados</span>
                              <span className="text-[10px] text-[#6B7280]">Quedan {cuotasRestantes} días</span>
                            </div>
                          </div>

                          {/* Último pago */}
                          {fechaUltimoPago && (
                            <p className="text-[11px] text-[#6B7280] mb-2">
                              Último pago: {fechaUltimoPago.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}

                          {/* Alerta de atraso en el préstamo */}
                          {p.diasAtrasados > 0 && (
                            <div className="mb-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-2.5">
                              <p className="text-[11px] font-medium text-[#EF4444]">
                                Debe {p.diasAtrasados} día{p.diasAtrasados !== 1 ? 's' : ''} = {moneyFmt.format(saldoAtrasado)}
                              </p>
                              <p className="text-[10px] text-[#6B7280] mt-0.5">
                                Pague {moneyFmt.format(saldoAtrasado)} para cubrir el atraso y luego continúe con la cuota regular.
                              </p>
                            </div>
                          )}

                          {p.estado === 'pagado' && (
                            <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#ECFDF5] px-3 py-2 text-xs font-medium text-[#10B981]">
                              <BadgeCheck size={13} /> Préstamo completado
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Botón único de cobro ── */}
                {(() => {
                  const activos = (selectedCliente.prestamosCliente || []).filter(p => p.estado === 'activo')
                  if (activos.length === 0) return null

                  const totalCuotaDiaria = activos.reduce((s, p) => s + Number(p.cuotaDiaria), 0)
                  const totalDiasAtrasados = Math.max(0, ...activos.map(p => p.diasAtrasados))
                  const totalSaldoAtrasado = activos.reduce((s, p) => s + (p.diasAtrasados > 0 ? Number(p.cuotaDiaria) * p.diasAtrasados : 0), 0)
                  const totalSaldoHoy = totalSaldoAtrasado + totalCuotaDiaria
                  const clienteYaPagoHoy = activos.every(p => yaPagoHoy(p))
                  const esPrimerDia = activos.every(p => p.diasPagados === 0 && p.diasAtrasados === 0)

                  return (
                    <div className="mt-3">
                      {clienteYaPagoHoy || esPrimerDia ? (
                        <Tooltip text={esPrimerDia ? 'El préstamo empezó hoy. El primer cobro se hace mañana.' : 'Este cliente ya pagó hoy. Vuelve mañana para cobrar.'}>
                          <div className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E5E7EB] px-3 py-3 text-sm font-medium text-[#9CA3AF] cursor-not-allowed">
                            <Clock size={14} /> {esPrimerDia ? 'Primer día — cobra mañana' : 'Ya cobró hoy'}
                          </div>
                        </Tooltip>
                      ) : totalDiasAtrasados > 0 ? (
                        <Tooltip text={`Registra el pago para cubrir ${totalDiasAtrasados} día(s) de atraso más la cuota de hoy. Total: ${moneyFmt.format(totalSaldoHoy)}`}>
                          <button onClick={() => {
                            const primerActivo = activos[0] as unknown as Prestamo
                            handleCobrar(primerActivo, totalSaldoHoy)
                          }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#EF4444] px-3 py-3 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors">
                            <AlertTriangle size={14} /> Ponerse al día ({moneyFmt.format(totalSaldoHoy)})
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip text={`Registra el cobro de la cuota diaria. Se descuenta del saldo pendiente del préstamo.`}>
                          <button onClick={() => {
                            const primerActivo = activos[0] as unknown as Prestamo
                            handleCobrar(primerActivo, totalCuotaDiaria)
                          }}
                            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#5B5FEF] px-3 py-3 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors">
                            <Banknote size={14} /> Cobrar cuota ({moneyFmt.format(totalCuotaDiaria)})
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* ── Historial de pagos recientes ── */}
              {(() => {
                const todosLosPagos: any[] = []
                ;(selectedCliente.prestamosCliente || []).forEach(p => {
                  ;((p as any).pagos || []).forEach((pg: any) => {
                    todosLosPagos.push({ ...pg, montoPrestamo: p.montoSolicitado })
                  })
                })
                todosLosPagos.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())
                const recientes = todosLosPagos.slice(0, 5)
                if (recientes.length === 0) return null
                return (
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">Pagos recientes</h4>
                    <div className="rounded-lg border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
                      {recientes.map((pg) => (
                        <div key={pg.id} className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              pg.esPagoAtrasado ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#ECFDF5] text-[#10B981]'
                            }`}>
                              {pg.esPagoAtrasado ? <AlertTriangle size={10} /> : <BadgeCheck size={10} />}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#111827]">{moneyFmt.format(Number(pg.monto))}</p>
                              <p className="text-[10px] text-[#6B7280]">{pg.diasCubiertos} día{pg.diasCubiertos !== 1 ? 's' : ''} cubierto{pg.diasCubiertos !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#6B7280]">
                              {new Date(pg.fechaPago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </span>
                            <button onClick={() => openEditPago(pg)} className="rounded p-0.5 text-[#6B7280] hover:text-[#F59E0B] transition-colors" title="Editar pago">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                            <button onClick={() => openDeletePago(pg)} className="rounded p-0.5 text-[#6B7280] hover:text-[#EF4444] transition-colors" title="Eliminar pago">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Nuevo Cliente ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); setFormMsg(null) }} />
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <h3 className="text-sm font-semibold text-[#111827]">Crear nuevo cliente</h3>
              <button onClick={() => { setShowModal(false); setFormMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCliente} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Cédula *</label>
                  <input placeholder="Ej: 10101010" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Nombre *</label>
                  <input placeholder="Nombre" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Apellido</label>
                  <input placeholder="Apellido" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
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
              <p className="text-[11px] text-[#6B7280]">La contraseña del cliente será su cédula.</p>
              {formMsg && (
                <div className={`rounded-lg p-3 text-sm ${formMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {formMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setFormMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Pago ── */}
      {pagoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPagoEditando(null); setPagoMsg(null) }} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Editar pago</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">#{pagoEditando.id} — ${Number(pagoEditando.monto).toLocaleString('es-CO')}</p>
              </div>
              <button onClick={() => { setPagoEditando(null); setPagoMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Monto</label>
                <input type="number" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={pagoMontoEdit} onChange={(e) => setPagoMontoEdit(e.target.value)} required min="1" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Fecha del pago</label>
                <input type="datetime-local" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={pagoFechaEdit} onChange={(e) => setPagoFechaEdit(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Motivo del cambio *</label>
                <textarea rows={2} placeholder="Ej: Me equivoqué al digitar el monto" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] resize-none" value={pagoMotivo} onChange={(e) => setPagoMotivo(e.target.value)} required />
              </div>
              {pagoMsg && (
                <div className={`rounded-lg p-3 text-sm ${pagoMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {pagoMsg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{pagoMsg.text}</> : <><X size={14} className="inline mr-1" />{pagoMsg.text}</>}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPagoEditando(null); setPagoMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEditPago} disabled={pagoSaving || !pagoMotivo.trim()} className="flex-1 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#D97706] transition-colors disabled:opacity-50">
                  {pagoSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eliminar Pago ── */}
      {pagoEliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Eliminar pago</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">#{pagoEliminando.id} — {moneyFmt.format(Number(pagoEliminando.monto))}</p>
                </div>
              </div>
              <button onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] p-3 text-sm text-[#B91C1C]">
                Esta acción eliminará el pago y ajustará el saldo del préstamo. Esta operación queda registrada en la auditoría.
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Motivo de la eliminación *</label>
                <textarea rows={2} placeholder="Ej: Pago duplicado, error al registrar" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] resize-none" value={pagoMotivo} onChange={(e) => setPagoMotivo(e.target.value)} required />
              </div>
              {pagoMsg && (
                <div className={`rounded-lg p-3 text-sm ${pagoMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {pagoMsg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{pagoMsg.text}</> : <><X size={14} className="inline mr-1" />{pagoMsg.text}</>}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDeletePago} disabled={pagoSaving || !pagoMotivo.trim()} className="flex-1 rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50">
                  {pagoSaving ? 'Eliminando...' : 'Eliminar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Cliente ── */}
      {editandoCliente && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setEditingCliente(false); setEditMsg(null) }} />
          <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Editar cliente</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">{selectedCliente.nombre} {selectedCliente.apellido} — {selectedCliente.cedula}</p>
              </div>
              <button onClick={() => { setEditingCliente(false); setEditMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Nombre *</label>
                  <input placeholder="Nombre" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Apellido</label>
                  <input placeholder="Apellido" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={editForm.apellido} onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Teléfono</label>
                  <input placeholder="Teléfono" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Email</label>
                  <input placeholder="Email" type="email" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Dirección</label>
                  <input placeholder="Dirección" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={editForm.direccion} onChange={(e) => setEditForm({ ...editForm, direccion: e.target.value })} />
                </div>
              </div>
              {editMsg && (
                <div className={`rounded-lg p-3 text-sm ${editMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {editMsg.text}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setEditingCliente(false); setEditMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEditCliente} disabled={editSaving || !editForm.nombre.trim()} className="flex-1 rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors disabled:opacity-50">
                  {editSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════ PRESTAMOS VIEW ═══════════════════════════ */

function PrestamosView({ clientes, cargarPrestamos }: { clientes: Cliente[]; cargarPrestamos: () => Promise<void> }) {
  const [buscarCliente, setBuscarCliente] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedClientePrestamo, setSelectedClientePrestamo] = useState<Cliente | null>(null)
  const [monto, setMonto] = useState('')
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [tasa, setTasa] = useState(20)
  const [cuotaDiaria, setCuotaDiaria] = useState(5000)

  useEffect(() => {
    fetch('/api/configuracion')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTasa(Number(d.data.tasaInteres))
          setCuotaDiaria(Number(d.data.cuotaDiariaMinima))
        }
      })
  }, [])

  const clientesFiltrados = buscarCliente
    ? clientes.filter(c => `${c.nombre} ${c.apellido} ${c.cedula}`.toLowerCase().includes(buscarCliente.toLowerCase()))
    : clientes

  const montoNum = parseFloat(monto) || 0
  const interesNuevo = montoNum * (tasa / 100)
  const montoNuevoConInteres = montoNum + interesNuevo

  const prestamoActivo = selectedClientePrestamo?.prestamosCliente?.find(p => p.estado === 'activo')
  const saldoExistente = prestamoActivo ? Number(prestamoActivo.saldoPendiente) : 0
  const totalExistente = prestamoActivo ? Number(prestamoActivo.montoTotal) : 0
  const tieneActivo = !!prestamoActivo

  const montoTotalFinal = tieneActivo ? totalExistente + montoNuevoConInteres : montoNuevoConInteres
  const diasPlazo = montoTotalFinal > 0 ? Math.ceil(montoTotalFinal / cuotaDiaria) : 0

  function openPrestamoModal(c: Cliente) {
    setSelectedClientePrestamo(c)
    setMonto('')
    setFormMsg(null)
    setShowModal(true)
  }

  async function handleCreatePrestamo(e: FormEvent) {
    e.preventDefault()
    if (!selectedClientePrestamo || !montoNum) return
    setSaving(true)
    setFormMsg(null)

    const res = await fetch('/api/prestamos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: selectedClientePrestamo.id, monto: montoNum }),
    })
    const data = await res.json()
    if (data.success) {
      setShowModal(false)
      setSelectedClientePrestamo(null)
      setMonto('')
      await cargarPrestamos()
    } else {
      setFormMsg({ ok: false, text: data.message })
    }
    setSaving(false)
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#111827]">Nuevo préstamo</h2>
        <p className="mt-0.5 text-sm text-[#6B7280]">Selecciona un cliente para otorgar un préstamo</p>
      </div>

      <div className="max-w-2xl rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-2">
            <Search size={15} className="text-[#6B7280] shrink-0" />
            <input placeholder="Buscar por nombre o cédula..." className="bg-transparent text-sm outline-none w-full" value={buscarCliente} onChange={(e) => setBuscarCliente(e.target.value)} />
          </div>
        </div>
        <div className="divide-y divide-[#E5E7EB] max-h-[400px] overflow-y-auto">
          {clientesFiltrados.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#6B7280]">No hay clientes</p>
          ) : (
            clientesFiltrados.map((c) => (
              <button key={c.id} onClick={() => openPrestamoModal(c)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#F7F8FA] transition-colors">
                <Avatar nombre={c.nombre} apellido={c.apellido} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#111827]">{c.nombre} {c.apellido}</p>
                  <p className="text-xs text-[#6B7280]">{c.cedula}</p>
                </div>
                <span className="rounded-lg bg-[#EEF0FF] px-3 py-1.5 text-xs font-medium text-[#5B5FEF]">Crear préstamo</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Modal: Nuevo Préstamo ── */}
      {showModal && selectedClientePrestamo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); setFormMsg(null) }} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Nuevo préstamo</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">{selectedClientePrestamo.nombre} {selectedClientePrestamo.apellido}</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] hover:text-[#111827] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePrestamo} className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Monto solicitado</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">$</span>
                  <input type="number" placeholder="0" className="w-full rounded-lg border border-[#E5E7EB] py-2.5 pl-7 pr-3 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={monto} onChange={(e) => setMonto(e.target.value)} required min="1" autoFocus />
                </div>
              </div>

              {montoNum > 0 && (
                <div className="rounded-xl bg-[#F7F8FA] p-4 space-y-3">
                  {tieneActivo && (
                    <div className="rounded-lg bg-[#FFFBEB] border border-[#FDE68A] p-3 mb-3">
                      <p className="text-[11px] font-medium text-[#92400E]">
                        Este cliente tiene un préstamo activo. El nuevo monto se anexará al saldo existente.
                      </p>
                      <p className="text-[10px] text-[#B45309] mt-1">
                        Saldo actual: {moneyFmt.format(saldoExistente)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280] flex items-center gap-1">Monto solicitado <InfoTip text="El dinero que el cliente pide prestado." /></span>
                    <span className="font-medium text-[#111827]">{moneyFmt.format(montoNum)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6B7280] flex items-center gap-1">Interés ({tasa}%) <InfoTip text="El porcentaje que se cobra por prestar el dinero. Se calcula sobre el monto solicitado." /></span>
                    <span className="font-medium text-[#EF4444]">+ {moneyFmt.format(interesNuevo)}</span>
                  </div>
                  {tieneActivo && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280]">Saldo existente</span>
                        <span className="font-medium text-[#F59E0B]">+ {moneyFmt.format(saldoExistente)}</span>
                      </div>
                      <div className="border-t border-[#E5E7EB] pt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#6B7280]">Total nuevo</span>
                          <span className="font-medium text-[#111827]">{moneyFmt.format(montoNuevoConInteres)}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <div className="border-t border-[#E5E7EB] pt-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#111827] flex items-center gap-1">{tieneActivo ? 'Deuda total' : 'Total a pagar'} <InfoTip text={tieneActivo ? 'La suma de lo que ya debe más el nuevo préstamo con interés.' : 'El dinero prestado más el interés. Es lo que el cliente debe devolver en total.'} /></span>
                    <span className="font-bold text-[#5B5FEF] text-lg">{moneyFmt.format(montoTotalFinal)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-lg bg-white p-3 text-center border border-[#E5E7EB]">
                      <p className="text-[11px] text-[#6B7280] flex items-center justify-center gap-1">Cuota diaria <InfoTip text="Cuánto debe pagar el cliente cada día para cubrir el préstamo en el plazo establecido." /></p>
                      <p className="text-sm font-bold text-[#111827]">{moneyFmt.format(cuotaDiaria)}</p>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-center border border-[#E5E7EB]">
                      <p className="text-[11px] text-[#6B7280] flex items-center justify-center gap-1">{tieneActivo ? 'Días totales' : 'Días a pagar'} <InfoTip text={tieneActivo ? 'Días totales que el cliente tendrá para pagar toda su deuda.' : 'Cantidad de días que el cliente tendrá para pagar el préstamo completo.'} /></p>
                      <p className="text-sm font-bold text-[#111827]">{diasPlazo} días</p>
                    </div>
                  </div>
                </div>
              )}

              {formMsg && (
                <div className={`rounded-lg p-3 text-sm ${formMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {formMsg.text}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setFormMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || montoNum <= 0} className="flex-1 rounded-lg bg-[#5B5FEF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4B4FDF] transition-colors disabled:opacity-50">
                  {saving ? 'Registrando...' : 'Registrar Préstamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════ PAGOS VIEW ═══════════════════════════ */

type PagoConCliente = {
  id: number; monto: string; fechaPago: string; diasCubiertos: number
  esPagoAtrasado: number; createdAt: string
  prestamo: { clienteId: number; montoTotal: string; cliente: { nombre: string; apellido: string; cedula: string } }
}

type ClientePagos = {
  clienteId: number; nombre: string; apellido: string; cedula: string
  pagos: PagoConCliente[]
  totalPagado: number
}

function PagosView() {
  const [pagos, setPagos] = useState<PagoConCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [pagoEditando, setPagoEditando] = useState<any>(null)
  const [pagoEliminando, setPagoEliminando] = useState<any>(null)
  const [pagoMotivo, setPagoMotivo] = useState('')
  const [pagoMontoEdit, setPagoMontoEdit] = useState('')
  const [pagoFechaEdit, setPagoFechaEdit] = useState('')
  const [pagoSaving, setPagoSaving] = useState(false)
  const [pagoMsg, setPagoMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function openEditPago(pg: any) {
    setPagoEditando(pg)
    setPagoMontoEdit(String(Number(pg.monto)))
    const f = new Date(pg.fechaPago)
    setPagoFechaEdit(f.toISOString().slice(0, 16))
    setPagoMotivo('')
    setPagoMsg(null)
  }

  async function handleEditPago() {
    if (!pagoEditando || !pagoMotivo.trim()) return
    setPagoSaving(true)
    setPagoMsg(null)
    const res = await fetch('/api/pagos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pago_id: pagoEditando.id,
        monto: Number(pagoMontoEdit),
        fechaPago: pagoFechaEdit ? new Date(pagoFechaEdit).toISOString() : undefined,
        motivo: pagoMotivo.trim(),
      }),
    })
    const d = await res.json()
    if (d.success) {
      setPagoEditando(null)
      setPagoMsg(null)
      const r = await fetch('/api/pagos?limit=200')
      const rd = await r.json()
      if (rd.success) setPagos(rd.data)
    } else {
      setPagoMsg({ ok: false, text: d.message })
    }
    setPagoSaving(false)
  }

  function openDeletePago(pg: any) {
    setPagoEliminando(pg)
    setPagoMotivo('')
    setPagoMsg(null)
  }

  async function handleDeletePago() {
    if (!pagoEliminando || !pagoMotivo.trim()) return
    setPagoSaving(true)
    setPagoMsg(null)
    const res = await fetch('/api/pagos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pago_id: pagoEliminando.id, motivo: pagoMotivo.trim() }),
    })
    const d = await res.json()
    if (d.success) {
      setPagoEliminando(null)
      setPagoMsg(null)
      const r = await fetch('/api/pagos?limit=200')
      const rd = await r.json()
      if (rd.success) setPagos(rd.data)
    } else {
      setPagoMsg({ ok: false, text: d.message })
    }
    setPagoSaving(false)
  }

  useEffect(() => {
    fetch('/api/pagos?limit=200')
      .then(r => r.json())
      .then(d => { if (d.success) setPagos(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const clientesMap = new Map<number, ClientePagos>()
  pagos.forEach(p => {
    const cid = p.prestamo.clienteId
    if (!clientesMap.has(cid)) {
      clientesMap.set(cid, {
        clienteId: cid,
        nombre: p.prestamo.cliente.nombre,
        apellido: p.prestamo.cliente.apellido,
        cedula: p.prestamo.cliente.cedula,
        pagos: [],
        totalPagado: 0,
      })
    }
    const cp = clientesMap.get(cid)!
    cp.pagos.push(p)
    cp.totalPagado += Number(p.monto)
  })

  let clientesArray = Array.from(clientesMap.values())
  if (buscar) {
    const term = buscar.toLowerCase()
    clientesArray = clientesArray.filter(c => `${c.nombre} ${c.apellido} ${c.cedula}`.toLowerCase().includes(term))
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#111827]">Historial de pagos</h2>
          <p className="mt-0.5 text-sm text-[#6B7280]">Pagos agrupados por cliente</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 w-72">
          <Search size={15} className="text-[#6B7280] shrink-0" />
          <input placeholder="Buscar cliente..." className="bg-transparent text-sm outline-none w-full" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" /></div>
      ) : clientesArray.length === 0 ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-10 text-center">
          <p className="text-sm text-[#6B7280]">No hay pagos registrados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clientesArray.map((cp) => (
            <div key={cp.clienteId} className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              {/* Header del cliente */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3.5 bg-[#F7F8FA]">
                <div className="flex items-center gap-3">
                  <Avatar nombre={cp.nombre} apellido={cp.apellido} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{cp.nombre} {cp.apellido}</p>
                    <p className="text-xs text-[#6B7280]">{cp.cedula}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#6B7280]">{cp.pagos.length} pago{cp.pagos.length !== 1 ? 's' : ''}</p>
                  <p className="text-sm font-bold text-[#10B981]">{moneyFmt.format(cp.totalPagado)}</p>
                </div>
              </div>
              {/* Pagos del cliente */}
              <div className="divide-y divide-[#E5E7EB]">
                {cp.pagos.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#F7F8FA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        p.esPagoAtrasado ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#ECFDF5] text-[#10B981]'
                      }`}>
                        {p.esPagoAtrasado ? <AlertTriangle size={12} /> : <BadgeCheck size={12} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{moneyFmt.format(Number(p.monto))}</p>
                        <p className="text-[11px] text-[#6B7280]">{p.diasCubiertos} día{p.diasCubiertos !== 1 ? 's' : ''} cubierto{p.diasCubiertos !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-[#6B7280]">
                          {new Date(p.fechaPago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        {p.esPagoAtrasado ? (
                          <span className="text-[11px] font-medium text-[#EF4444]">Atrasado</span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#10B981]">A tiempo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditPago(p)} className="rounded p-1 text-[#6B7280] hover:text-[#F59E0B] transition-colors" title="Editar pago">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button onClick={() => openDeletePago(p)} className="rounded p-1 text-[#6B7280] hover:text-[#EF4444] transition-colors" title="Eliminar pago">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cp.pagos.length > 5 && (
                <div className="border-t border-[#E5E7EB] px-5 py-2.5 text-center">
                  <p className="text-xs text-[#6B7280]">+ {cp.pagos.length - 5} pago{cp.pagos.length - 5 !== 1 ? 's' : ''} más</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Editar Pago ── */}
      {pagoEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPagoEditando(null); setPagoMsg(null) }} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Editar pago</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">#{pagoEditando.id} — ${Number(pagoEditando.monto).toLocaleString('es-CO')}</p>
              </div>
              <button onClick={() => { setPagoEditando(null); setPagoMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Monto</label>
                <input type="number" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={pagoMontoEdit} onChange={(e) => setPagoMontoEdit(e.target.value)} required min="1" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Fecha del pago</label>
                <input type="datetime-local" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF]" value={pagoFechaEdit} onChange={(e) => setPagoFechaEdit(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Motivo del cambio *</label>
                <textarea rows={2} placeholder="Ej: Me equivoqué al digitar el monto" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] resize-none" value={pagoMotivo} onChange={(e) => setPagoMotivo(e.target.value)} required />
              </div>
              {pagoMsg && (
                <div className={`rounded-lg p-3 text-sm ${pagoMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {pagoMsg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{pagoMsg.text}</> : <><X size={14} className="inline mr-1" />{pagoMsg.text}</>}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPagoEditando(null); setPagoMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleEditPago} disabled={pagoSaving || !pagoMotivo.trim()} className="flex-1 rounded-lg bg-[#F59E0B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#D97706] transition-colors disabled:opacity-50">
                  {pagoSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Eliminar Pago ── */}
      {pagoEliminando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} />
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FEF2F2] text-[#EF4444]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">Eliminar pago</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5">#{pagoEliminando.id} — {moneyFmt.format(Number(pagoEliminando.monto))}</p>
                </div>
              </div>
              <button onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} className="rounded-lg p-1 text-[#6B7280] hover:bg-[#F7F8FA] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] p-3 text-sm text-[#B91C1C]">
                Esta acción eliminará el pago y ajustará el saldo del préstamo. Esta operación queda registrada en la auditoría.
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">Motivo de la eliminación *</label>
                <textarea rows={2} placeholder="Ej: Pago duplicado, error al registrar" className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm outline-none focus:border-[#5B5FEF] focus:ring-2 focus:ring-[#EEF0FF] resize-none" value={pagoMotivo} onChange={(e) => setPagoMotivo(e.target.value)} required />
              </div>
              {pagoMsg && (
                <div className={`rounded-lg p-3 text-sm ${pagoMsg.ok ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                  {pagoMsg.ok ? <><CheckCircle2 size={14} className="inline mr-1" />{pagoMsg.text}</> : <><X size={14} className="inline mr-1" />{pagoMsg.text}</>}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setPagoEliminando(null); setPagoMsg(null) }} className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDeletePago} disabled={pagoSaving || !pagoMotivo.trim()} className="flex-1 rounded-lg bg-[#EF4444] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#DC2626] transition-colors disabled:opacity-50">
                  {pagoSaving ? 'Eliminando...' : 'Eliminar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ═══════════════════════════ SUBCOMPONENTS ═══════════════════════════ */

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

function StatCard({ icon, iconBg, label, value, color, tip }: { icon: React.ReactNode; iconBg: string; label: string; value: string; color?: string; tip?: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg mb-3" style={{}}><div className={iconBg + ' flex h-9 w-9 items-center justify-center rounded-lg'}>{icon}</div></div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-[#6B7280]">{label}</p>
        {tip && <InfoTip text={tip} />}
      </div>
      <p className={`text-2xl font-bold ${color || 'text-[#111827]'}`}>{value}</p>
    </div>
  )
}
