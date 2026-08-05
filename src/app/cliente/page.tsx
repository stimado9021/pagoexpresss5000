'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, CreditCard, DollarSign, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Calendar, Banknote, BadgeCheck, Phone, Mail, MapPin, Users,
} from 'lucide-react'

const moneyFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })

type Pago = {
  id: number; monto: string; fechaPago: string; diasCubiertos: number
  esPagoAtrasado: number; createdAt: string
}

type Prestamo = {
  id: number; montoSolicitado: string; montoTotal: string; montoPagado: string
  saldoPendiente: string; cuotaDiaria: string; estado: string
  fechaInicio: string; fechaFinEsperada: string; diasPagados: number; diasAtrasados: number
  diasPlazo: number; tasaInteres: string; interesTotal: string
  pagos?: Pago[]
}

type ClienteData = {
  cedula: string; nombre: string; apellido: string
  telefono: string | null; email: string | null; direccion: string | null
}

export default function ClientePage() {
  const router = useRouter()
  const [prestamos, setPrestamos] = useState<Prestamo[]>([])
  const [cliente, setCliente] = useState<ClienteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantName, setTenantName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) { router.push('/login'); return }
        setPrestamos(res.data.prestamos || [])
        if (res.data.cliente) setCliente(res.data.cliente)
        if (res.data.tenantName) setTenantName(res.data.tenantName)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const activos = prestamos.filter((p) => p.estado === 'activo')
  const totalPendiente = activos.reduce((s, p) => s + Number(p.saldoPendiente), 0)
  const totalPagado = prestamos.reduce((s, p) => s + Number(p.montoPagado), 0)
  const cuotasPendientes = activos.reduce((s, p) => s + Math.max(0, p.diasPlazo - p.diasPagados), 0)
  const maxDiasAtraso = Math.max(0, ...activos.map(p => p.diasAtrasados))

  if (loading) return (
    <div className="min-h-screen bg-emerald-950 flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-bone/10 border-t-[#5B5FEF]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-emerald-950">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-bone/10 bg-graphite-900 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white shrink-0 sm:h-7 sm:w-7"><img src="/logo.webp" alt="PagoExpress" className="h-4 w-4 object-contain sm:h-5 sm:w-5" /></span>
          <span className="text-xs font-semibold text-bone sm:text-sm">PagoExpress</span>
          <span className="mx-1 text-bone/20 sm:mx-2">|</span>
          <span className="text-xs text-bone/60 sm:text-sm">Cliente</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-bone/10 px-2.5 py-1.5 text-xs text-bone/60 hover:bg-emerald-950 transition-colors sm:px-3 sm:text-sm">
          <LogOut size={14} /> Salir
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-4 space-y-4 sm:px-6 sm:py-6 sm:space-y-6 lg:px-8 lg:py-8 lg:space-y-8">
        <div className="mb-2 text-center sm:text-left">
          <h1 className="font-display font-bold text-xl text-white uppercase tracking-wider sm:text-2xl lg:text-4xl">
            {tenantName || 'EMPRESA'} : {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente'}
          </h1>
        </div>
        {/* â”€â”€ Info del cliente â”€â”€ */}
        {cliente && (
          <div className="flex items-start gap-3 rounded-xl border border-bone/10 bg-graphite-900 p-3 shadow-sm sm:gap-4 sm:p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime/10 text-xs font-semibold text-lime sm:h-10 sm:w-10 sm:text-sm">
              {(cliente.nombre[0] + (cliente.apellido?.[0] || '')).toUpperCase()}
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="text-xs font-semibold text-bone uppercase sm:text-sm">{cliente.nombre} {cliente.apellido}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-bone/60 sm:gap-3 sm:text-xs">
                <span className="flex items-center gap-1"><CreditCard size={10} className="sm:hidden" /><CreditCard size={12} className="hidden sm:block" /> {cliente.cedula}</span>
                {cliente.telefono && <span className="flex items-center gap-1"><Phone size={10} className="sm:hidden" /><Phone size={12} className="hidden sm:block" /> {cliente.telefono}</span>}
              </div>
              {cliente.email && <p className="flex items-center gap-1 text-[10px] text-bone/60 sm:text-xs"><Mail size={10} className="sm:hidden" /><Mail size={12} className="hidden sm:block" /> {cliente.email}</p>}
              {cliente.direccion && <p className="flex items-center gap-1 text-[10px] text-bone/60 sm:text-xs"><MapPin size={10} className="sm:hidden" /><MapPin size={12} className="hidden sm:block" /> {cliente.direccion}</p>}
            </div>
          </div>
        )}

        {/* â”€â”€ Alerta de mora â”€â”€ */}
        {maxDiasAtraso > 0 && (
          <div className={`rounded-xl border-2 p-3 sm:p-4 ${
            maxDiasAtraso >= 7 ? 'border-[#EF4444] bg-red-500/15' : 'border-[#F59E0B] bg-amber-500/15'
          }`}>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full sm:h-8 sm:w-8 ${
                maxDiasAtraso >= 7 ? 'bg-red-500 text-bone' : 'bg-amber-500 text-bone'
              }`}>
                <AlertTriangle size={14} className="sm:hidden" /><AlertTriangle size={16} className="hidden sm:block" />
              </div>
              <div>
                <p className={`text-xs font-semibold sm:text-sm ${maxDiasAtraso >= 7 ? 'text-red-400' : 'text-amber-400'}`}>
                  {maxDiasAtraso >= 7 ? 'ALERTA: Tienes pagos muy atrasados' : 'AVISO: Tienes un pequeÃ±o atraso'}
                </p>
                <p className="mt-0.5 text-[10px] text-bone/60 sm:mt-1 sm:text-xs">
                  Llevas {maxDiasAtraso} dÃ­a{maxDiasAtraso !== 1 ? 's' : ''} sin pagar. Contacta a tu vendedor para ponerte al dÃ­a.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Stats â”€â”€ */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime/10 text-lime mb-1.5 sm:h-8 sm:w-8 sm:mb-2 lg:h-9 lg:w-9 lg:mb-3"><CreditCard size={14} className="sm:hidden" /><CreditCard size={16} className="hidden sm:block" /></div>
            <p className="text-[10px] text-bone/60 sm:text-xs lg:text-sm">PrÃ©stamos activos</p>
            <p className="text-lg font-bold text-bone sm:text-xl lg:text-2xl">{activos.length}</p>
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 mb-1.5 sm:h-8 sm:w-8 sm:mb-2 lg:h-9 lg:w-9 lg:mb-3"><CheckCircle2 size={14} className="sm:hidden" /><CheckCircle2 size={16} className="hidden sm:block" /></div>
            <p className="text-[10px] text-bone/60 sm:text-xs lg:text-sm">Total pagado</p>
            <p className="text-lg font-bold text-emerald-400 sm:text-xl lg:text-2xl">{moneyFmt.format(totalPagado)}</p>
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 mb-1.5 sm:h-8 sm:w-8 sm:mb-2 lg:h-9 lg:w-9 lg:mb-3"><DollarSign size={14} className="sm:hidden" /><DollarSign size={16} className="hidden sm:block" /></div>
            <p className="text-[10px] text-bone/60 sm:text-xs lg:text-sm">Saldo pendiente</p>
            <p className="text-lg font-bold text-amber-400 sm:text-xl lg:text-2xl">{moneyFmt.format(totalPendiente)}</p>
          </div>
          <div className="rounded-xl border border-bone/10 bg-graphite-900 p-3 shadow-sm sm:p-4 lg:p-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 mb-1.5 sm:h-8 sm:w-8 sm:mb-2 lg:h-9 lg:w-9 lg:mb-3"><Clock size={14} className="sm:hidden" /><Clock size={16} className="hidden sm:block" /></div>
            <p className="text-[10px] text-bone/60 sm:text-xs lg:text-sm">Cuotas pendientes</p>
            <p className="text-lg font-bold text-amber-400 sm:text-xl lg:text-2xl">{cuotasPendientes} dÃ­as</p>
          </div>
        </div>

        {/* â”€â”€ PrÃ©stamos detallados â”€â”€ */}
        <div>
          <h2 className="text-sm font-semibold text-bone mb-3 sm:text-base sm:mb-4">Mis prÃ©stamos</h2>
          {prestamos.length === 0 ? (
            <div className="rounded-xl border border-bone/10 bg-graphite-900 p-8 text-center shadow-sm sm:p-12">
              <p className="text-xs text-bone/60 sm:text-sm">No tienes prÃ©stamos registrados</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {prestamos.map((p) => {
                const pct = Number(p.montoSolicitado) > 0 ? Math.round((Number(p.montoPagado) / Number(p.montoSolicitado)) * 100) : 0
                const montoConInteres = Number(p.montoSolicitado) * (1 + Number(p.tasaInteres) / 100)
                const cuotasRestantes = Math.max(0, p.diasPlazo - p.diasPagados)
                const saldoAtrasado = p.diasAtrasados > 0 ? Number(p.cuotaDiaria) * p.diasAtrasados : 0
                const fechaInicio = new Date(p.fechaInicio)
                const fechaFin = new Date(fechaInicio)
                fechaFin.setDate(fechaFin.getDate() + p.diasPlazo)
                const pagos = p.pagos || []
                const recientes = pagos.slice(0, 5)

                return (
                  <div key={p.id} className={`rounded-xl border overflow-hidden shadow-sm ${
                    p.diasAtrasados >= 7 ? 'border-[#EF4444]' :
                    p.diasAtrasados > 0 ? 'border-[#F59E0B]' : 'border-bone/10'
                  } bg-graphite-900`}>
                    {/* Header */}
                    <div className={`px-4 py-3 sm:px-5 sm:py-3.5 lg:px-6 lg:py-4 ${
                      p.diasAtrasados >= 7 ? 'bg-red-500/15' :
                      p.diasAtrasados > 0 ? 'bg-amber-500/15' : 'bg-emerald-950'
                    } border-b border-bone/10`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold sm:h-9 sm:w-9 sm:text-xs lg:h-10 lg:w-10 ${
                            p.estado === 'pagado' ? 'bg-emerald-500/20 text-emerald-400' :
                            p.diasAtrasados > 0 ? 'bg-red-500/15 text-red-400' : 'bg-lime/10 text-lime'
                          }`}>
                            {p.estado === 'pagado' ? <BadgeCheck size={16} className="sm:hidden" /> : `${pct}%`}
                            {p.estado === 'pagado' ? <BadgeCheck size={18} className="hidden sm:block" /> : null}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <p className="text-xs font-semibold text-bone sm:text-sm">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium sm:px-2 sm:py-0.5 sm:text-[10px] lg:text-[11px] ${
                                p.estado === 'activo' ? 'bg-lime/10 text-lime' :
                                p.estado === 'pagado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'
                              }`}>
                                {p.estado === 'activo' ? 'Activo' : p.estado === 'pagado' ? 'Pagado' : 'Cancelado'}
                              </span>
                              {p.diasAtrasados > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-bone sm:px-2 sm:text-[10px] lg:text-[11px]">
                                  <AlertTriangle size={8} className="sm:hidden" /> <AlertTriangle size={10} className="hidden sm:block" /> {p.diasAtrasados}d
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-bone/60 sm:text-xs lg:text-sm mt-0.5">{cuotasRestantes} dÃ­as restantes Â· {pct}% completado</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-amber-400 sm:text-sm">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                          <p className="text-[9px] text-bone/60 sm:text-[10px] lg:text-[11px]">saldo pendiente</p>
                        </div>
                      </div>
                    </div>

                    {/* Detalle */}
                    <div className="px-4 py-3 space-y-3 sm:px-5 sm:py-4 sm:space-y-4 lg:px-6 lg:py-5 lg:space-y-5">
                      {/* Fechas */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                        <div className="flex items-center gap-1.5 text-bone/60">
                          <Calendar size={10} className="sm:hidden" /><Calendar size={11} className="hidden sm:block" />
                          <span>Inicio: {fechaInicio.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-bone/60">
                          <Calendar size={10} className="sm:hidden" /><Calendar size={11} className="hidden sm:block" />
                          <span>Fin: {fechaFin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>

                      {/* Resumen financiero */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">Monto solicitado</p>
                          <p className="font-semibold text-bone">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">InterÃ©s ({p.tasaInteres}%)</p>
                          <p className="font-semibold text-red-400">+ {moneyFmt.format(Number(p.interesTotal))}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">Total a pagar</p>
                          <p className="font-bold text-lime">{moneyFmt.format(montoConInteres)}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">Cuota diaria</p>
                          <p className="font-semibold text-bone">{moneyFmt.format(Number(p.cuotaDiaria))}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">Pagado</p>
                          <p className="font-semibold text-emerald-400">{moneyFmt.format(Number(p.montoPagado))}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-950 p-2 sm:p-2.5 lg:p-3">
                          <p className="text-bone/60">Cuotas por pagar</p>
                          <p className="font-semibold text-bone">{cuotasRestantes} de {p.diasPlazo}</p>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-bone/60 sm:text-[11px]">Progreso de pago</span>
                          <span className="text-[10px] font-medium text-lime sm:text-[11px]">{pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-bone/10 sm:h-2.5">
                          <div className={`h-full rounded-full ${p.diasAtrasados > 0 ? 'bg-amber-500' : 'bg-lime'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[9px] text-bone/60 sm:text-[10px]">{p.diasPagados} dÃ­as pagados</span>
                          <span className="text-[9px] text-bone/60 sm:text-[10px]">Quedan {cuotasRestantes} dÃ­as</span>
                        </div>
                      </div>

                      {/* Alerta de atraso */}
                      {p.diasAtrasados > 0 && (
                        <div className="rounded-lg bg-red-500/15 border border-red-500/40 p-2 sm:p-3">
                          <p className="text-[10px] font-medium text-red-400 sm:text-xs">
                            Debes {p.diasAtrasados} dÃ­a{p.diasAtrasados !== 1 ? 's' : ''} = {moneyFmt.format(saldoAtrasado)}
                          </p>
                          <p className="text-[9px] text-bone/60 mt-0.5 sm:text-[11px]">
                            Paga {moneyFmt.format(saldoAtrasado + Number(p.cuotaDiaria))} para ponerte al dÃ­a con tu vendedor.
                          </p>
                        </div>
                      )}

                      {p.estado === 'pagado' && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-[10px] font-medium text-emerald-400 sm:text-xs">
                          <BadgeCheck size={12} /> PrÃ©stamo completado â€” Â¡Felicidades!
                        </div>
                      )}

                      {/* Pagos recientes */}
                      {recientes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-bone/60 mb-1.5 sm:text-[11px] sm:mb-2">Ãšltimos pagos</p>
                          <div className="rounded-lg border border-bone/10 divide-y divide-[#E5E7EB]">
                            {recientes.map((pg) => (
                              <div key={pg.id} className="flex items-center justify-between px-2.5 py-2 sm:px-3 sm:py-2.5">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <div className={`flex h-5 w-5 items-center justify-center rounded-full sm:h-6 sm:w-6 ${
                                    pg.esPagoAtrasado ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {pg.esPagoAtrasado ? <AlertTriangle size={8} className="sm:hidden" /> : <BadgeCheck size={8} className="sm:hidden" />}
                                    {pg.esPagoAtrasado ? <AlertTriangle size={10} className="hidden sm:block" /> : <BadgeCheck size={10} className="hidden sm:block" />}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-medium text-bone sm:text-xs">{moneyFmt.format(Number(pg.monto))}</p>
                                    <p className="text-[9px] text-bone/60 sm:text-[10px]">{pg.diasCubiertos} dÃ­a{pg.diasCubiertos !== 1 ? 's' : ''} cubierto{pg.diasCubiertos !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                                <span className="text-[9px] text-bone/60 sm:text-[10px]">
                                  {new Date(pg.fechaPago).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
