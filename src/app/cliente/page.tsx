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

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) { router.push('/login'); return }
        setPrestamos(res.data.prestamos || [])
        if (res.data.cliente) setCliente(res.data.cliente)
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
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[#5B5FEF]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-8 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5B5FEF] text-xs font-bold text-white">P</div>
          <span className="text-sm font-semibold text-[#111827]">PagoExpress</span>
          <span className="mx-2 text-[#E5E7EB]">|</span>
          <span className="text-sm text-[#6B7280]">Cliente</span>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F7F8FA] transition-colors">
          <LogOut size={15} /> Salir
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-8 space-y-8">
        {/* ── Info del cliente ── */}
        {cliente && (
          <div className="flex items-start gap-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF0FF] text-sm font-semibold text-[#5B5FEF]">
              {(cliente.nombre[0] + (cliente.apellido?.[0] || '')).toUpperCase()}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-[#111827]">{cliente.nombre} {cliente.apellido}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                <span className="flex items-center gap-1"><CreditCard size={12} /> {cliente.cedula}</span>
                {cliente.telefono && <span className="flex items-center gap-1"><Phone size={12} /> {cliente.telefono}</span>}
              </div>
              {cliente.email && <p className="flex items-center gap-1 text-xs text-[#6B7280]"><Mail size={12} /> {cliente.email}</p>}
              {cliente.direccion && <p className="flex items-center gap-1 text-xs text-[#6B7280]"><MapPin size={12} /> {cliente.direccion}</p>}
            </div>
          </div>
        )}

        {/* ── Alerta de mora ── */}
        {maxDiasAtraso > 0 && (
          <div className={`rounded-xl border-2 p-4 ${
            maxDiasAtraso >= 7 ? 'border-[#EF4444] bg-[#FEF2F2]' : 'border-[#F59E0B] bg-[#FFFBEB]'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                maxDiasAtraso >= 7 ? 'bg-[#EF4444] text-white' : 'bg-[#F59E0B] text-white'
              }`}>
                <AlertTriangle size={16} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${maxDiasAtraso >= 7 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                  {maxDiasAtraso >= 7 ? 'ALERTA: Tienes pagos muy atrasados' : 'AVISO: Tienes un pequeño atraso'}
                </p>
                <p className="text-xs mt-1 text-[#6B7280]">
                  Llevas {maxDiasAtraso} día{maxDiasAtraso !== 1 ? 's' : ''} sin pagar. Contacta a tu vendedor para ponerte al día.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF0FF] text-[#5B5FEF] mb-3"><CreditCard size={16} /></div>
            <p className="text-sm text-[#6B7280]">Préstamos activos</p>
            <p className="text-2xl font-bold text-[#111827]">{activos.length}</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#10B981] mb-3"><CheckCircle2 size={16} /></div>
            <p className="text-sm text-[#6B7280]">Total pagado</p>
            <p className="text-2xl font-bold text-[#10B981]">{moneyFmt.format(totalPagado)}</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B] mb-3"><DollarSign size={16} /></div>
            <p className="text-sm text-[#6B7280]">Saldo pendiente</p>
            <p className="text-2xl font-bold text-[#F59E0B]">{moneyFmt.format(totalPendiente)}</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#F59E0B] mb-3"><Clock size={16} /></div>
            <p className="text-sm text-[#6B7280]">Cuotas pendientes</p>
            <p className="text-2xl font-bold text-[#F59E0B]">{cuotasPendientes} días</p>
          </div>
        </div>

        {/* ── Préstamos detallados ── */}
        <div>
          <h2 className="text-base font-semibold text-[#111827] mb-4">Mis préstamos</h2>
          {prestamos.length === 0 ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-12 text-center shadow-sm">
              <p className="text-sm text-[#6B7280]">No tienes préstamos registrados</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    p.diasAtrasados > 0 ? 'border-[#F59E0B]' : 'border-[#E5E7EB]'
                  } bg-white`}>
                    {/* Header */}
                    <div className={`px-6 py-4 ${
                      p.diasAtrasados >= 7 ? 'bg-[#FEF2F2]' :
                      p.diasAtrasados > 0 ? 'bg-[#FFFBEB]' : 'bg-[#F7F8FA]'
                    } border-b border-[#E5E7EB]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                            p.estado === 'pagado' ? 'bg-[#ECFDF5] text-[#10B981]' :
                            p.diasAtrasados > 0 ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#EEF0FF] text-[#5B5FEF]'
                          }`}>
                            {p.estado === 'pagado' ? <BadgeCheck size={18} /> : `${pct}%`}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#111827]">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                p.estado === 'activo' ? 'bg-[#EEF0FF] text-[#5B5FEF]' :
                                p.estado === 'pagado' ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'
                              }`}>
                                {p.estado === 'activo' ? 'Activo' : p.estado === 'pagado' ? 'Pagado' : 'Cancelado'}
                              </span>
                              {p.diasAtrasados > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444] px-2 py-0.5 text-[11px] font-semibold text-white">
                                  <AlertTriangle size={10} /> {p.diasAtrasados}d atraso
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280] mt-0.5">{cuotasRestantes} días restantes · {pct}% completado</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#F59E0B]">{moneyFmt.format(Number(p.saldoPendiente))}</p>
                          <p className="text-[11px] text-[#6B7280]">saldo pendiente</p>
                        </div>
                      </div>
                    </div>

                    {/* Detalle siempre visible */}
                    <div className="px-6 py-5 space-y-5">
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
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Monto solicitado</p>
                          <p className="font-semibold text-[#111827]">{moneyFmt.format(Number(p.montoSolicitado))}</p>
                        </div>
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Interés ({p.tasaInteres}%)</p>
                          <p className="font-semibold text-[#EF4444]">+ {moneyFmt.format(Number(p.interesTotal))}</p>
                        </div>
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Total a pagar</p>
                          <p className="font-bold text-[#5B5FEF]">{moneyFmt.format(montoConInteres)}</p>
                        </div>
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Cuota diaria</p>
                          <p className="font-semibold text-[#111827]">{moneyFmt.format(Number(p.cuotaDiaria))}</p>
                        </div>
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Pagado</p>
                          <p className="font-semibold text-[#10B981]">{moneyFmt.format(Number(p.montoPagado))}</p>
                        </div>
                        <div className="rounded-lg bg-[#F7F8FA] p-3">
                          <p className="text-[#6B7280]">Cuotas por pagar</p>
                          <p className="font-semibold text-[#111827]">{cuotasRestantes} de {p.diasPlazo}</p>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#6B7280]">Progreso de pago</span>
                          <span className="text-[11px] font-medium text-[#5B5FEF]">{pct}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[#E5E7EB]">
                          <div className={`h-full rounded-full ${p.diasAtrasados > 0 ? 'bg-[#F59E0B]' : 'bg-[#5B5FEF]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-[#6B7280]">{p.diasPagados} días pagados</span>
                          <span className="text-[10px] text-[#6B7280]">Quedan {cuotasRestantes} días</span>
                        </div>
                      </div>

                      {/* Alerta de atraso */}
                      {p.diasAtrasados > 0 && (
                        <div className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] p-3">
                          <p className="text-xs font-medium text-[#EF4444]">
                            Debes {p.diasAtrasados} día{p.diasAtrasados !== 1 ? 's' : ''} = {moneyFmt.format(saldoAtrasado)}
                          </p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">
                            Paga {moneyFmt.format(saldoAtrasado + Number(p.cuotaDiaria))} para ponerte al día con tu vendedor.
                          </p>
                        </div>
                      )}

                      {p.estado === 'pagado' && (
                        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#ECFDF5] px-3 py-2.5 text-xs font-medium text-[#10B981]">
                          <BadgeCheck size={13} /> Préstamo completado — ¡Felicidades!
                        </div>
                      )}

                      {/* Pagos recientes */}
                      {recientes.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] mb-2">Últimos pagos</p>
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
                                <span className="text-[10px] text-[#6B7280]">
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
