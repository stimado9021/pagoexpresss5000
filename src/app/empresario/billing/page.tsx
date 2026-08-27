'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CreditCard, Check, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'

type Plan = { id: number; nombre: string; slug: string; precioMensual: number; precioAnual: number | null; description: string | null }
type MeData = {
  tenant: { nombre: string; subdominio: string; status: string; trialEndsAt: string; planNombre: string | null }
  suscripcion: {
    id: number; planId: number; planNombre: string | null; estado: string; intervalo: string
    pagadoHasta: string | null; stripeCustomerId: string | null; wompiCustomerId: string | null
    limiteVendedores: number; limiteClientes: number
  } | null
  planes: Plan[]
  uso: { vendedores: number; clientes: number; prestamosActivos: number }
}

const statusLabels: Record<string, { text: string; cls: string }> = {
  TRIAL: { text: 'Prueba gratis', cls: 'bg-lime-500/15 text-lime-400' },
  ACTIVE: { text: 'Activo', cls: 'bg-emerald-500/20 text-emerald-400' },
  TRIAL_EXPIRED: { text: 'Trial vencido', cls: 'bg-amber-500/15 text-amber-400' },
  SUSPENDED: { text: 'Suspendido', cls: 'bg-red-500/15 text-red-400' },
  CANCELLED: { text: 'Cancelado', cls: 'bg-gray-500/15 text-gray-400' },
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  )
}

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<MeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [yearly, setYearly] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wompi' | 'stripe'>('wompi')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/me')
      if (res.status === 401) { router.push('/login'); return }
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const checkoutParam = searchParams.get('checkout')
  const checkoutMsg = checkoutParam === 'success'
    ? { ok: true, text: 'Pago procesado correctamente. Tu plan ya está activo.' }
    : checkoutParam === 'canceled'
      ? { ok: false, text: 'El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.' }
      : null

  async function checkout(planId: number) {
    setMsg(null)
    setCheckoutLoading(planId)
    try {
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, intervalo: yearly ? 'ANUAL' : 'MONTHLY', paymentMethod }),
      })
      const json = await res.json()
      if (json.success && json.url) {
        window.location.assign(json.url)
      } else {
        setMsg({ ok: false, text: json.message || 'No se pudo iniciar el pago' })
      }
    } catch {
      setMsg({ ok: false, text: 'Error al iniciar el pago' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function openPortal() {
    setMsg(null)
    try {
      const res = await fetch('/api/subscriptions/portal', { method: 'POST' })
      const json = await res.json()
      if (json.success && json.url) {
        window.location.assign(json.url)
      } else {
        setMsg({ ok: false, text: json.message || 'No se pudo abrir el portal' })
      }
    } catch {
      setMsg({ ok: false, text: 'Error al abrir el portal de pagos' })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-950">
        <Loader2 size={28} className="animate-spin text-lime-400" />
      </div>
    )
  }

  const status = data?.tenant.status ?? 'TRIAL'
  const statusInfo = statusLabels[status] ?? statusLabels.TRIAL
  const planActualId = data?.suscripcion?.planId

  return (
    <div className="min-h-screen bg-emerald-950 text-zinc-100 font-body p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => router.push('/empresario')} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft size={16} /> Volver al panel
          </button>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.cls}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusInfo.text}
          </span>
        </div>

        <div className="mb-10 flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold">Suscripción y plan</h1>
          <p className="text-sm text-zinc-400">
            {data?.tenant.nombre} · {data?.tenant.subdominio}
          </p>
        </div>

        {msg && (
          <div className={`mb-6 rounded-xl border p-4 text-sm ${msg.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
            {msg.text}
          </div>
        )}

        {(checkoutMsg ?? msg) && (
          <div className={`mb-6 rounded-xl border p-4 text-sm ${(checkoutMsg ?? msg)!.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
            {(checkoutMsg ?? msg)!.text}
          </div>
        )}

        <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Plan actual</p>
            <p className="mt-2 font-display text-lg font-semibold">{data?.suscripcion?.planNombre ?? 'Trial — Independiente'}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {data?.suscripcion?.pagadoHasta
                ? `Válido hasta ${new Date(data.suscripcion.pagadoHasta).toLocaleDateString('es-CO')}`
                : data?.tenant.status === 'TRIAL'
                  ? `Trial hasta ${new Date(data.tenant.trialEndsAt).toLocaleDateString('es-CO')}`
                  : 'Sin plan activo'}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Vendedores</p>
            <p className="mt-2 font-display text-lg font-semibold">{data?.uso.vendedores} <span className="text-sm font-normal text-zinc-500">/ {data?.suscripcion?.limiteVendedores === -1 ? '∞' : data?.suscripcion?.limiteVendedores}</span></p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Clientes</p>
            <p className="mt-2 font-display text-lg font-semibold">{data?.uso.clientes} <span className="text-sm font-normal text-zinc-500">/ {data?.suscripcion?.limiteClientes === -1 ? '∞' : data?.suscripcion?.limiteClientes}</span></p>
          </div>
        </div>

        {(status === 'TRIAL_EXPIRED' || status === 'SUSPENDED' || status === 'CANCELLED') && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="text-sm text-amber-300">
              <p className="font-semibold">Tu acceso está limitado.</p>
              <p className="mt-1 text-amber-200/80">Activa un plan para continuar usando el panel de Kredipay. Tus datos están seguros y se restaurarán al pagar.</p>
            </div>
          </div>
        )}

        {(() => {
          const expiryRaw = data?.suscripcion?.pagadoHasta || data?.tenant.trialEndsAt
          if (!expiryRaw || ['TRIAL_EXPIRED','SUSPENDED','CANCELLED'].includes(status)) return null
          // eslint-disable-next-line react-hooks/purity
          const daysLeft = Math.ceil((new Date(expiryRaw).getTime() - Date.now()) / (1000*60*60*24))
          if (daysLeft > 3 || daysLeft < 0) return null
          return (
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-400" />
              <div className="flex-1 text-sm text-amber-300">
                <p className="font-semibold">Tu plan vence en {daysLeft} día{daysLeft!==1?'s':''} — {new Date(expiryRaw).toLocaleDateString('es-CO')}</p>
                <p className="mt-1 text-amber-200/80">Renueva ahora para evitar la suspensión automática. Si pagas antes, los días se acumulan.</p>
              </div>
              <button onClick={() => document.getElementById('planes-grid')?.scrollIntoView({behavior:'smooth'})} className="hidden sm:inline-flex shrink-0 rounded-full bg-amber-500 px-5 py-2.5 font-display text-sm font-semibold text-emerald-950 hover:bg-amber-400 transition-colors">Renovar ahora</button>
            </div>
          )
        })()}

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Elige tu plan</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${!yearly ? 'font-semibold text-zinc-100' : 'text-zinc-400'}`}>Mensual</span>
            <button
              onClick={() => setYearly((v) => !v)}
              className={`relative h-7 w-14 rounded-full border border-zinc-700 transition-colors ${yearly ? 'bg-lime-500' : 'bg-emerald-700'}`}
              aria-label="Alternar facturación"
            >
              <span
                className="absolute top-0.5 left-0.5 h-[22px] w-[22px] rounded-full transition-transform"
                style={{ background: yearly ? '#0B3D2E' : '#C9F24C', transform: yearly ? 'translateX(28px)' : 'translateX(0)' }}
              />
            </button>
            <span className={`text-sm ${yearly ? 'font-semibold text-zinc-100' : 'text-zinc-400'}`}>
              Anual <span className="font-mono text-lime-400">(-10%)</span>
            </span>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="font-display text-sm font-semibold text-zinc-300">Método de pago</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {([
              { id: 'wompi', label: 'Wompi', sub: 'Tarjetas · PSE · Nequi · Bancolombia', recommended: true },
              { id: 'stripe', label: 'Stripe', sub: 'Tarjetas internacionales', recommended: false },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${paymentMethod === m.id ? 'border-lime-500 bg-lime-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
              >
                <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${paymentMethod === m.id ? 'border-lime-400 bg-lime-400' : 'border-zinc-600'}`} />
                <span>
                  <span className="flex items-center gap-2 font-display text-sm font-semibold">
                    {m.label}
                    {m.recommended && <span className="rounded-full bg-lime-500 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-950">Recomendado</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{m.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div id="planes-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data?.planes.map((plan) => {
            const precio = yearly && plan.precioAnual ? plan.precioAnual : plan.precioMensual
            const esActual = plan.id === planActualId
            const popular = plan.slug === 'empresarial'
            return (
              <div key={plan.id} className={`flex flex-col rounded-3xl border bg-zinc-900 p-7 ${popular ? 'border-lime-500' : 'border-zinc-800'} ${esActual ? 'ring-1 ring-lime-500/50' : ''}`}>
                {popular && (
                  <span className="mb-4 inline-flex self-start rounded-full bg-lime-500 px-3 py-1 font-mono text-xs font-semibold text-emerald-950">★ Más popular</span>
                )}
                <h3 className="font-display text-lg font-semibold">{plan.nombre}</h3>
                <p className="mt-1 min-h-[3rem] text-xs text-zinc-400 leading-relaxed">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold">${Number(precio).toLocaleString('es-CO')}</span>
                  <span className="text-sm text-zinc-500">/mes</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-zinc-500">{yearly ? 'Facturado anualmente' : 'Facturado mensualmente'}</p>
                <ul className="mt-6 space-y-2.5 text-sm text-zinc-300 flex-1">
                  <li className="flex items-center gap-2"><Check size={15} className="text-lime-400" /> Hasta {plan.slug === 'independiente' ? '150' : plan.slug === 'empresarial' ? '1,500' : 'ilimitados'} clientes</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-lime-400" /> {plan.slug === 'independiente' ? '1 agente adicional' : plan.slug === 'empresarial' ? '15 agentes / terceros' : 'Agentes ilimitados'}</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-lime-400" /> Cálculo automático de intereses</li>
                </ul>
                {esActual ? (
                  <div className="mt-7 space-y-2">
                    <button disabled className="w-full rounded-full border border-zinc-700 py-3 font-display text-sm font-semibold text-zinc-400">Plan actual</button>
                    <button
                      onClick={() => checkout(plan.id)}
                      disabled={checkoutLoading !== null}
                      className="w-full rounded-full bg-lime-500 py-2.5 font-display text-sm font-semibold text-emerald-950 hover:bg-zinc-200 transition-colors disabled:opacity-60"
                    >
                      {checkoutLoading === plan.id ? 'Redirigiendo...' : 'Renovar / Extender'}
                    </button>
                    <p className="text-center font-mono text-[11px] text-zinc-500">Paga y se acumula a tu vigencia actual</p>
                  </div>
                ) : (
                  <button
                    onClick={() => checkout(plan.id)}
                    disabled={checkoutLoading !== null}
                    className={`mt-7 w-full rounded-full py-3 font-display text-sm font-semibold transition-colors disabled:opacity-60 ${popular ? 'bg-lime-500 text-emerald-950 hover:bg-zinc-200' : 'border border-zinc-700 hover:border-lime-500-500 hover:text-lime-400'}`}
                  >
                    {checkoutLoading === plan.id ? 'Redirigiendo...' : popular ? 'Actualizar ahora' : 'Cambiar a este plan'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {data?.suscripcion?.stripeCustomerId && (
          <div className="mt-10 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div>
              <h3 className="font-display font-semibold">Portal de pagos</h3>
              <p className="mt-1 text-sm text-zinc-500">Actualiza tu método de pago, descarga facturas o cancela la suscripción.</p>
            </div>
            <button onClick={openPortal} className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm hover:border-lime-500-500 hover:text-lime-400 transition-colors">
              Abrir portal <ExternalLink size={14} />
            </button>
          </div>
        )}

        <div className="mt-10 pb-6 text-center">
          <button onClick={() => router.push('/empresario')} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition-colors">
            <CreditCard size={15} /> ¿Preguntas sobre facturación? soporte@kredipay.com
          </button>
        </div>
      </div>
    </div>
  )
}
