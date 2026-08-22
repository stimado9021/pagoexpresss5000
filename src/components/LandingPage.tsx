'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import WhatsAppWidget from './WhatsAppWidget';
import { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES } from '@/lib/logo';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function animateCount(
  el: HTMLElement,
  target: number,
  opts: { prefix?: string; suffix?: string; decimals?: number; duration?: number } = {}
) {
  const { prefix = '', suffix = '', decimals = 0, duration = 1400 } = opts;
  const start = performance.now();
  function tick(now: number) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = target * eased;
    el.textContent =
      prefix +
      val.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
      suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const Check = () => (
  <svg width="16" height="16" className="mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M5 13L9 17L19 7" stroke="#C9F24C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const WHATSAPP_NUMBER = '573247716650';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola, quiero información sobre Kredipay.')}`;

const WhatsAppIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
  </svg>
);

/* ─── Main Component ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [yearly, setYearly] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [subdisponible, setSubdisponible] = useState<boolean | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [form, setForm] = useState({
    empresa: '',
    adminNombre: '',
    adminApellido: '',
    correo: '',
    telefono: '',
    subdominio: '',
    logo: '',
  });

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [k]: value }));
    if (k === 'subdominio') {
      const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
      if (slug.length >= 3) {
        setSubdisponible(null);
        fetch(`/api/auth/subdominio?slug=${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .then((d) => setSubdisponible(d.available))
          .catch(() => setSubdisponible(null));
      } else {
        setSubdisponible(null);
      }
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    const file = e.target.files?.[0];
    if (!file) {
      setForm((f) => ({ ...f, logo: '' }));
      setLogoPreview('');
      return;
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
      setLogoError('Formato no permitido. Usa PNG, JPG o WebP.');
      setForm((f) => ({ ...f, logo: '' }));
      setLogoPreview('');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('La imagen supera los 200 KB.');
      setForm((f) => ({ ...f, logo: '' }));
      setLogoPreview('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setForm((f) => ({ ...f, logo: dataUrl }));
      setLogoPreview(dataUrl);
    };
    reader.onerror = () => setLogoError('No se pudo leer el archivo.');
    reader.readAsDataURL(file);
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.subdominio.trim().length < 3) {
      setFormError('Elige un subdominio de al menos 3 caracteres.');
      return;
    }
    if (subdisponible === false) {
      setFormError('Ese subdominio ya está en uso. Prueba con otro.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa: form.empresa,
          adminNombre: form.adminNombre,
          adminApellido: form.adminApellido,
          correo: form.correo,
          telefono: form.telefono,
          subdominio: form.subdominio,
          logo: form.logo || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormSent(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFormError(data.message || 'Error al registrar la empresa.');
      }
    } catch {
      setFormError('Error de conexión. Intenta de nuevo.');
    } finally {
      setFormLoading(false);
    }
  };

  const statCartera = useRef<HTMLParagraphElement>(null);
  const statClientes = useRef<HTMLParagraphElement>(null);
  const statAgentes = useRef<HTMLParagraphElement>(null);
  const statMora = useRef<HTMLParagraphElement>(null);
  const heroCountersFired = useRef(false);
  const [stats, setStats] = useState<{
    carteraActiva: number;
    saldoPendiente: number;
    prestamosActivos: number;
    totalPrestamos: number;
    clientes: number;
    agentes: number;
    tasaMora: number;
    cobrosSemana: number;
    empresasActivas: number;
    cobrosPorDia: { fecha: string; etiqueta: string; monto: number; height: number }[];
  }>({
    carteraActiva: 0,
    saldoPendiente: 0,
    prestamosActivos: 0,
    totalPrestamos: 0,
    clientes: 0,
    agentes: 0,
    tasaMora: 0,
    cobrosSemana: 0,
    empresasActivas: 0,
    cobrosPorDia: [],
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.fade-up').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const dataLoadedRef = useRef(false);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((d) => { if (d.success) { setStats(d.data); dataLoadedRef.current = true; } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!statCartera.current || !dataLoadedRef.current) return;
    const heroObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting && !heroCountersFired.current && dataLoadedRef.current) {
          heroCountersFired.current = true;
          if (statCartera.current) animateCount(statCartera.current, stats.carteraActiva, { prefix: '$' });
          if (statClientes.current) animateCount(statClientes.current, stats.clientes);
          if (statAgentes.current) animateCount(statAgentes.current, stats.agentes);
          if (statMora.current) animateCount(statMora.current, stats.tasaMora, { suffix: '%', decimals: 1 });
          heroObs.disconnect();
        }
      }),
      { threshold: 0.4 }
    );
    heroObs.observe(statCartera.current);
    return () => heroObs.disconnect();
  }, [stats.carteraActiva, stats.clientes, stats.agentes, stats.tasaMora, mounted]);

  const closeMobile = () => setMobileOpen(false);
  const price = (monthly: number) => yearly ? `$${Math.round(monthly * 0.95)}` : `$${monthly}`;

  return (
    <div className="text-bone antialiased bg-emerald-900 font-body">

      {/* ════════════════════════════ NAV ═════════════════════════════ */}
      <header id="site-nav" className="fixed top-0 inset-x-0 z-50 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className={`flex items-center justify-between py-4 transition-all duration-300 rounded-2xl${navScrolled ? ' bg-graphite-900/90 backdrop-blur-xl border border-bone/10 shadow-lg shadow-black/20' : ''}`}>

            <a href="#top" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                  <img src="/logo.webp" alt="Kredipay" className="h-8 w-8 object-contain" />
              </span>
              <span className="font-display font-bold text-lg tracking-tight text-bone">Kredipay</span>
            </a>

            <nav className="hidden lg:flex items-center gap-8 font-body text-sm text-bone/80">
              <a href="#beneficios" className="hover:text-lime transition-colors">Beneficios</a>
              <a href="#planes" className="hover:text-lime transition-colors">Planes</a>
              <a href="#oferta" className="hover:text-lime transition-colors">Oferta</a>
              <a href="#registro" className="hover:text-lime transition-colors">Registro</a>
            </nav>

            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login" className="font-body text-sm text-bone/80 hover:text-bone transition-colors">
                Iniciar sesión
              </Link>
              <a href="#registro" className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 font-display text-sm font-semibold text-emerald-950 hover:bg-bone transition-colors">
                Crear mi espacio
              </a>
            </div>

            <button
              id="mobile-menu-btn"
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-bone/15 text-bone"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              {mobileOpen
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              }
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="lg:hidden pb-5">
              <div className="flex flex-col gap-1 rounded-2xl bg-graphite-900/95 border border-bone/10 p-3 font-body text-sm">
                {[['#beneficios','Beneficios'],['#planes','Planes'],['#oferta','Oferta'],['#registro','Registro']].map(([href, label]) => (
                  <a key={href} href={href} onClick={closeMobile} className="rounded-lg px-4 py-3 text-bone/85 hover:bg-graphite-800">{label}</a>
                ))}
                <Link href="/login" onClick={closeMobile} className="rounded-lg px-4 py-3 text-bone/85 hover:bg-graphite-800">Iniciar sesión</Link>
                <a href="#registro" onClick={closeMobile} className="mt-1 rounded-lg bg-lime px-4 py-3 text-center font-display font-semibold text-emerald-950">Crear mi espacio</a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ════════════════════════════ HERO ════════════════════════════ */}
      <section id="top" className="relative overflow-hidden pt-36 pb-0 lg:pt-44">
        <div className="absolute inset-0 grid-lines" />
        <div className="absolute inset-0 noise-overlay" />
        <img src="/smiling-young-asian-woman-holding-money-showing-thumbs-up.webp" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" loading="eager" decoding="async" />
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute top-40 left-[-15%] h-[420px] w-[420px] rounded-full bg-lime/10 blur-[110px]" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">

            {/* Copy */}
            <div className="lg:col-span-6 fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-lime pulse-dot" />
                <span className="font-mono text-xs text-lime tracking-wide">Software para prestamistas y empresas de crédito</span>
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.06] tracking-tight text-bone">
                Lleva tu negocio de préstamos <span className="text-lime">al siguiente nivel.</span>
              </h1>

              <p className="mt-6 font-body text-lg text-bone/70 max-w-xl leading-relaxed">
                Kredipay es el sistema integral para gestionar préstamos personales y préstamos colocados a través de terceros: cobros, agentes, intereses y cartera, todo desde un mismo panel de control.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                <a href="#registro" className="group inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-4 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors">
                  Registrar mi empresa
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:translate-x-1">
                    <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <a href="#planes" className="inline-flex items-center justify-center gap-2 rounded-full border border-bone/20 px-7 py-4 font-display font-semibold text-bone hover:border-bone/50 transition-colors">
                  Ver planes y precios
                </a>
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#25D366]/40 px-7 py-4 font-display font-semibold text-[#25D366] hover:bg-[#25D366]/10 transition-colors">
                  <WhatsAppIcon size={18} />
                  Escríbenos por WhatsApp
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-bone/50 font-body text-sm">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 6V11C4 16 7.5 20.5 12 22C16.5 20.5 20 16 20 11V6L12 2Z" stroke="currentColor" strokeWidth="1.6" /></svg>
                  Datos cifrados de extremo a extremo
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Sin tarjeta de crédito
                </div>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="lg:col-span-6 fade-up" style={{ transitionDelay: '.1s' }}>
              <div className="relative">
                <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-lime/15 via-transparent to-emerald-500/10 blur-2xl" />
                <div className="relative rounded-3xl border border-bone/10 bg-graphite-900/90 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
                  {/* window bar */}
                  <div className="flex items-center justify-between border-b border-bone/10 px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
                      <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
                      <span className="h-2.5 w-2.5 rounded-full bg-bone/15" />
                    </div>
                    <span className="font-mono text-[11px] text-bone/40">app.kredipay.vercel.app/dashboard</span>
                    <span className="w-12" />
                  </div>

                  <div className="p-5 lg:p-6">
                    {!mounted ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="h-3 w-24 rounded bg-bone/10" />
                            <div className="h-7 w-32 rounded bg-bone/10" />
                          </div>
                          <div className="h-6 w-16 rounded-full bg-emerald-500/10" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[1,2,3].map((n) => (
                            <div key={n} className="rounded-xl bg-graphite-800 border border-bone/5 p-3.5 space-y-2">
                              <div className="h-2 w-12 rounded bg-bone/10" />
                              <div className="h-5 w-10 rounded bg-bone/10" />
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl bg-graphite-800 border border-bone/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="h-2 w-32 rounded bg-bone/10" />
                            <div className="h-2 w-10 rounded bg-bone/10" />
                          </div>
                          <div className="flex items-end gap-2 h-24">
                            {[1,2,3,4,5,6,7].map((n) => (
                              <div key={n} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full max-w-6 rounded-t-md bg-bone/10" style={{ height: `${20 + n * 8}%` }} />
                                <div className="h-1.5 w-4 rounded bg-bone/10" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <p className="font-mono text-[11px] uppercase tracking-widest text-bone/40">Cartera activa</p>
                            <p ref={statCartera} className="font-display font-bold text-2xl text-bone mt-1">$0</p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 border border-emerald-500/30 px-3 py-1 font-mono text-xs text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                            En vivo
                          </span>
                        </div>

                        {/* mini stat grid */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="rounded-xl bg-graphite-800 border border-bone/5 p-3.5">
                            <p className="font-mono text-[10px] uppercase text-bone/40">Clientes</p>
                            <p ref={statClientes} className="font-display font-semibold text-lg text-bone mt-1">0</p>
                          </div>
                          <div className="rounded-xl bg-graphite-800 border border-bone/5 p-3.5">
                            <p className="font-mono text-[10px] uppercase text-bone/40">Agentes</p>
                            <p ref={statAgentes} className="font-display font-semibold text-lg text-bone mt-1">0</p>
                          </div>
                          <div className="rounded-xl bg-graphite-800 border border-bone/5 p-3.5">
                            <p className="font-mono text-[10px] uppercase text-bone/40">Mora</p>
                            <p ref={statMora} className="font-display font-semibold text-lg text-lime mt-1">0%</p>
                          </div>
                        </div>

                        {/* bar chart */}
                        <div className="rounded-xl bg-graphite-800 border border-bone/5 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-bone/40">Cobros de la semana</p>
                            <p className="font-mono text-[10px] text-emerald-400">${stats.cobrosSemana.toLocaleString('es-CO')}</p>
                          </div>
                          <div className="flex items-end gap-1.5 sm:gap-2 h-36 sm:h-44">
                            {(stats.cobrosPorDia.length > 0 ? stats.cobrosPorDia : Array.from({ length: 7 }, () => ({
                              etiqueta: '', monto: 0, height: 4, fecha: '',
                            }))).map((c, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1 group" title={`${c.etiqueta}: $${c.monto.toLocaleString('es-CO')}`}>
                                <span className="text-[8px] sm:text-[9px] font-mono text-bone/50 group-hover:text-lime transition-colors">
                                  {c.monto > 0 ? (c.monto >= 1000000 ? `$${(c.monto / 1000000).toFixed(1)}M` : c.monto >= 1000 ? `$${Math.round(c.monto / 1000)}k` : `$${c.monto}`) : ''}
                                </span>
                                <div
                                  className={`w-full max-w-8 rounded-t-md ${c.monto > 0 ? 'bg-lime' : 'bg-emerald-800/60'} grow-bar transition-colors group-hover:bg-lime`}
                                  style={{ height: `${Math.max(c.height, 6)}%`, animationDelay: `${i * 0.07}s` }}
                                />
                                <span className="text-[8px] uppercase text-bone/40 truncate w-full text-center hidden sm:block">{c.etiqueta}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Ledger ticker */}
        <div className="relative mt-16 border-y border-bone/10 bg-emerald-950/60 py-3.5 overflow-hidden ticker-wrap">
          <div className="ticker-track font-mono text-sm text-bone/60 whitespace-nowrap">
            {[...Array(2)].map((_, i) => (
              <span key={i}>
                {mounted ? (
                  <>
                    <span className="mx-6">Cobros procesados hoy: <span className="text-lime">${stats.cobrosSemana.toLocaleString('es-CO')}</span></span>
                    <span className="mx-6 text-bone/20">/</span>
                    <span className="mx-6">Tasa de mora promedio: <span className="text-lime">{stats.tasaMora}%</span></span>
                    <span className="mx-6 text-bone/20">/</span>
                    <span className="mx-6">Empresas activas en Kredipay: <span className="text-lime">{stats.empresasActivas || 0}</span></span>
                    <span className="mx-6 text-bone/20">/</span>
                    <span className="mx-6">Préstamos activos: <span className="text-lime">{stats.prestamosActivos}</span></span>
                    <span className="mx-6 text-bone/20">/</span>
                    <span className="mx-6">Clientes registrados: <span className="text-lime">{stats.clientes}</span></span>
                    <span className="mx-6 text-bone/20">/</span>
                  </>
                ) : (
                  <span className="mx-6 text-bone/30">Cargando datos del sistema...</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════ BENEFICIOS ══════════════════════════ */}
      <section id="beneficios" className="relative py-24 lg:py-32 bg-emerald-950 overflow-hidden">
        <img src="/la-mano-de-los-hombres-que-lleva-cabo-billetes-de-d%C3%B3lar-del-americano-ciento-del-dinero-mano-del-dinero-de-ofrecimiento-del-45658769.webp" alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" loading="lazy" decoding="async" />
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
          <div className="max-w-2xl fade-up">
            <p className="font-mono text-xs uppercase text-lime sub-eyebrow">Todo en un solo lugar</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 text-bone leading-tight">
              Las herramientas que tu operación de préstamos necesita
            </h2>
            <p className="mt-4 font-body text-bone/65 leading-relaxed">
              Desde el primer desembolso hasta el último cobro, Kredipay ordena cada parte del ciclo de tu cartera para que tu equipo trabaje con datos claros, no con hojas de cálculo dispersas.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'Gestión de cobros',
                desc: 'Programa cuotas, registra pagos parciales y automatiza recordatorios para reducir la mora sin perseguir a cada cliente manualmente.',
                icon: <path d="M3 10H21M7 15H9M3 6C3 5 4 4 5 4H19C20 4 21 5 21 6V18C21 19 20 20 19 20H5C4 20 3 19 3 18V6Z" stroke="#C9F24C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
              },
              {
                title: 'Control de terceros y agentes',
                desc: 'Asigna carteras a agentes o prestamistas asociados, define comisiones y da seguimiento a su desempeño con permisos independientes.',
                icon: <path d="M17 20V18C17 15.79 15.21 14 13 14H6C3.79 14 2 15.79 2 18V20M9.5 11C11.71 11 13.5 9.21 13.5 7C13.5 4.79 11.71 3 9.5 3C7.29 3 5.5 4.79 5.5 7C5.5 9.21 7.29 11 9.5 11ZM17 8L19 10L23 6" stroke="#C9F24C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
              },
              {
                title: 'Reportes automatizados',
                desc: 'Genera reportes de cartera, mora y rendimiento por agente en segundos, listos para exportar o compartir con tu equipo directivo.',
                icon: <><path d="M4 19V13M4 13V5H10L12 7H20V19H4Z" stroke="#C9F24C" strokeWidth="1.7" strokeLinejoin="round" /><path d="M8 16H16" stroke="#C9F24C" strokeWidth="1.7" strokeLinecap="round" /></>,
              },
              {
                title: 'Cálculo de intereses',
                desc: 'Configura tasas fijas, variables o sobre saldo y deja que el sistema calcule intereses, moras y refinanciamientos sin errores manuales.',
                icon: <path d="M12 2V22M17 5H9.5C7.57 5 6 6.57 6 8.5C6 10.43 7.57 12 9.5 12H14.5C16.43 12 18 13.57 18 15.5C18 17.43 16.43 19 14.5 19H6" stroke="#C9F24C" strokeWidth="1.7" strokeLinecap="round" />,
              },
              {
                title: 'Seguridad de datos',
                desc: 'Cifrado de extremo a extremo, respaldo automático y control de accesos por rol para proteger la información financiera de tus clientes.',
                icon: <><path d="M12 2L4 6V11C4 16 7.5 20.5 12 22C16.5 20.5 20 16 20 11V6L12 2Z" stroke="#C9F24C" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 12L11 14L15 10" stroke="#C9F24C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></>,
              },
              {
                title: 'Espacio de trabajo propio',
                desc: 'Cada empresa obtiene su propio subdominio y panel independiente, con su marca, sus usuarios y sus datos completamente aislados.',
                icon: <path d="M5 3V7M3 5H7M6 17V21M4 19H8M13 3L15.5 9.5L22 12L15.5 14.5L13 21L10.5 14.5L4 12L10.5 9.5L13 3Z" stroke="#C9F24C" strokeWidth="1.4" strokeLinejoin="round" />,
              },
            ].map(({ title, desc, icon }, i) => (
              <div key={title} className="lift-card fade-up rounded-2xl border border-bone/10 bg-graphite-900 p-7 hover:border-lime/30"
                style={{ transitionDelay: `${[0, .05, .1, 0, .05, .1][i]}s` }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700/30 border border-emerald-500/20 mb-5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{icon}</svg>
                </div>
                <h3 className="font-display font-semibold text-lg text-bone">{title}</h3>
                <p className="mt-2.5 font-body text-sm text-bone/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ PLANES ════════════════════════════ */}
      <section id="planes" className="relative py-24 lg:py-32 bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">

          <div className="max-w-2xl mx-auto text-center fade-up">
            <p className="font-mono text-xs uppercase text-lime sub-eyebrow">Planes y precios</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 text-bone leading-tight">
              Un plan para cada etapa de tu cartera
            </h2>
            <p className="mt-4 font-body text-bone/65 leading-relaxed">
              Empieza con lo esencial y crece sin fricciones. Cambia de plan cuando tu número de clientes y agentes lo requiera.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="mt-10 flex items-center justify-center gap-4 fade-up">
            <span id="label-mensual" className={`font-body text-sm ${!yearly ? 'font-semibold text-bone' : 'text-bone/60'}`}>Mensual</span>
            <button
              id="billing-toggle"
              onClick={() => setYearly((v) => !v)}
              className={`switch-track relative h-7 w-14 rounded-full border border-bone/20 ${yearly ? 'bg-lime' : 'bg-emerald-700'}`}
              aria-label="Cambiar entre facturación mensual y anual"
            >
              <span
                id="switch-thumb"
                className="switch-thumb absolute top-0.5 left-0.5 rounded-full"
                style={{
                  height: '1.375rem', width: '1.375rem',
                  background: yearly ? '#0B3D2E' : '#C9F24C',
                  transform: yearly ? 'translateX(1.75rem)' : 'translateX(0)',
                }}
              />
            </button>
            <span id="label-anual" className={`font-body text-sm ${yearly ? 'font-semibold text-bone' : 'text-bone/60'}`}>
              Anual <span className="text-lime font-mono">(-5%)</span>
            </span>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Plan Independiente */}
            <div className="lift-card fade-up rounded-3xl border border-bone/10 bg-graphite-900 p-8 flex flex-col">
              <h3 className="font-display font-semibold text-xl text-bone">Independiente</h3>
              <p className="mt-2 font-body text-sm text-bone/55">Para prestamistas que están comenzando a formalizar su cartera.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display font-bold text-4xl text-bone">{price(39)}</span>
                <span className="font-body text-bone/50 text-sm">/mes</span>
              </div>
              <p className="font-mono text-xs text-bone/40 mt-1">Facturado {yearly ? 'anualmente' : 'mensualmente'}</p>
              <ul className="mt-7 space-y-3.5 font-body text-sm text-bone/75 flex-1">
                {['Hasta 25 clientes activos','Hasta 4 vendedores / agentes','Cálculo automático de intereses','Reportes básicos mensuales','Soporte por correo'].map((f) => (
                  <li key={f} className="flex gap-2.5"><Check />{f}</li>
                ))}
              </ul>
              <a href="#registro" className="mt-8 inline-flex items-center justify-center rounded-full border border-bone/20 py-3.5 font-display font-semibold text-bone hover:border-lime hover:text-lime transition-colors">
                Comenzar ahora
              </a>
            </div>

            {/* Plan Empresarial */}
            <div className="lift-card fade-up relative rounded-3xl border-2 border-lime bg-graphite-900 p-8 flex flex-col lg:-translate-y-4 shadow-2xl shadow-lime/10" style={{ transitionDelay: '.05s' }}>
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-lime px-4 py-1.5 font-mono text-xs font-semibold text-emerald-950 whitespace-nowrap">
                ★ Plan más popular
              </span>
              <h3 className="font-display font-semibold text-xl text-bone">Empresarial</h3>
              <p className="mt-2 font-body text-sm text-bone/55">Para empresas de crédito con equipo de cobro y agentes en campo.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display font-bold text-4xl text-bone">{price(99)}</span>
                <span className="font-body text-bone/50 text-sm">/mes</span>
              </div>
              <p className="font-mono text-xs text-bone/40 mt-1">Facturado {yearly ? 'anualmente' : 'mensualmente'}</p>
              <ul className="mt-7 space-y-3.5 font-body text-sm text-bone/75 flex-1">
                {['Hasta 50 clientes activos','Hasta 8 vendedores / agentes','Comisiones y control de terceros','Reportes avanzados y exportables','Subdominio y marca propia','Soporte prioritario 24/7'].map((f) => (
                  <li key={f} className="flex gap-2.5"><Check />{f}</li>
                ))}
              </ul>
              <a href="#registro" className="mt-8 inline-flex items-center justify-center rounded-full bg-lime py-3.5 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors">
                Comenzar ahora
              </a>
            </div>

            {/* Plan Corporativo */}
            <div className="lift-card fade-up rounded-3xl border border-bone/10 bg-graphite-900 p-8 flex flex-col" style={{ transitionDelay: '.1s' }}>
              <h3 className="font-display font-semibold text-xl text-bone">Corporativo</h3>
              <p className="mt-2 font-body text-sm text-bone/55">Para redes de prestamistas y operaciones de alto volumen.</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display font-bold text-4xl text-bone">{price(249)}</span>
                <span className="font-body text-bone/50 text-sm">/mes</span>
              </div>
              <p className="font-mono text-xs text-bone/40 mt-1">Facturado {yearly ? 'anualmente' : 'mensualmente'}</p>
              <ul className="mt-7 space-y-3.5 font-body text-sm text-bone/75 flex-1">
                {['Clientes ilimitados','Vendedores / agentes ilimitados','Integraciones vía API','Panel multi-empresa / multi-sede','Gerente de cuenta dedicado'].map((f) => (
                  <li key={f} className="flex gap-2.5"><Check />{f}</li>
                ))}
              </ul>
              <a href="#registro" className="mt-8 inline-flex items-center justify-center rounded-full border border-bone/20 py-3.5 font-display font-semibold text-bone hover:border-lime hover:text-lime transition-colors">
                Comenzar ahora
              </a>
            </div>

          </div>

          <p className="mt-8 text-center font-body text-sm text-bone/45 fade-up">
            ¿Necesitas algo a la medida? <a href="#registro" className="text-lime hover:underline">Habla con nuestro equipo comercial</a>.
          </p>
        </div>
      </section>

      {/* ════════════════════════ OFERTA ESPECIAL ═════════════════════ */}
      <section id="oferta" className="relative py-16 lg:py-20 bg-emerald-950 overflow-hidden">
        <img src="/png-transparent-money-wallet-woman-united-states-dollar-banknote-money-bag-saving-service-public-relations-thumbnail.webp" alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" loading="lazy" decoding="async" />
        <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
          <div className="fade-up relative overflow-hidden rounded-3xl border border-lime/25 bg-gradient-to-br from-emerald-800 via-emerald-900 to-graphite-900 px-8 py-12 lg:px-14 lg:py-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-lime/10 blur-[100px]" />
            <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-gold/10 blur-[90px]" />
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full bg-gold/15 border border-gold/40 px-4 py-1.5 font-mono text-xs text-gold mb-4">
                  🎉 Oferta de lanzamiento
                </span>
                <h3 className="font-display font-bold text-2xl sm:text-3xl text-bone leading-snug">
                  14 días de prueba gratis + 50% de descuento tu primer mes
                </h3>
                <p className="mt-3 font-body text-bone/65">
                  Registra tu empresa hoy y activa tu espacio de trabajo sin costo. Solo pagas si decides quedarte.
                </p>
              </div>
              <a href="#registro" className="shrink-0 inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors whitespace-nowrap">
                Aprovechar la oferta
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ REGISTRO ═══════════════════════════ */}
      <section id="registro" className="relative py-24 lg:py-32 bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-50" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-start">

            {/* Left: copy */}
            <div className="lg:col-span-5 fade-up">
              <p className="font-mono text-xs uppercase text-lime sub-eyebrow">Crea tu espacio de trabajo</p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 text-bone leading-tight">
                Tu empresa, con su propio panel en minutos
              </h2>
              <p className="mt-4 font-body text-bone/65 leading-relaxed">
                Completa el formulario y te enviaremos el acceso a tu subdominio exclusivo dentro de Kredipay. Sin instalaciones, sin procesos largos.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  'Regístrate con los datos de tu empresa.',
                  'Elige el subdominio de tu espacio de trabajo.',
                  'Empieza a cargar tu cartera y tu equipo de cobro.',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700/30 border border-emerald-500/20 font-mono text-xs text-lime">{i + 1}</span>
                    <p className="font-body text-sm text-bone/70 pt-1">{step}</p>
                  </div>
                ))}
              </div>

              {/* Enlace al login */}
              <div className="mt-10 pt-8 border-t border-bone/15">
                <p className="font-body text-sm text-bone/60">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="text-lime font-semibold hover:underline inline-flex items-center gap-1">
                    Iniciar sesión
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </p>
              </div>
            </div>

            {/* Right: form */}
            <div className="lg:col-span-7 fade-up" style={{ transitionDelay: '.08s' }}>
              <form
                id="registro-form"
                className="rounded-3xl border border-bone/10 bg-graphite-900 p-7 sm:p-9"
                onSubmit={handleRegistro}
              >
                {formSent ? (
                  <div className="text-center py-10">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime/15 border border-lime/30 mb-5">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13L9 17L19 7" stroke="#C9F24C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <h3 className="font-display font-semibold text-xl text-bone">¡Solicitud recibida!</h3>
                    <p className="mt-2 font-body text-sm text-bone/60">Tu espacio de trabajo ya está creado. Te enviamos el acceso por correo.</p>
                    <a
                      href="/empresario"
                      className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors"
                    >
                      Ir a mi panel
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {[
                        { id: 'empresa', label: 'Nombre de la empresa', placeholder: 'Créditos del Valle S.A.S', type: 'text', value: form.empresa, onChange: setField('empresa') },
                        { id: 'admin', label: 'Nombre del administrador', placeholder: 'María', type: 'text', value: form.adminNombre, onChange: setField('adminNombre') },
                        { id: 'adminApellido', label: 'Apellido del administrador', placeholder: 'Fernández', type: 'text', value: form.adminApellido, onChange: setField('adminApellido') },
                      ].map(({ id, label, placeholder, type, value, onChange }) => (
                        <div key={id}>
                          <label htmlFor={id} className="block font-body text-xs font-semibold uppercase tracking-wide text-bone/50 mb-2">{label}</label>
                          <input required={id !== 'adminApellido'} type={type} id={id} name={id} placeholder={placeholder} value={value} onChange={onChange}
                            className="w-full rounded-xl border border-bone/15 bg-graphite-800 px-4 py-3.5 font-body text-sm text-bone placeholder:text-bone/30 focus:border-lime focus:outline-none transition-colors" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                      {[
                        { id: 'correo', label: 'Correo electrónico', placeholder: 'maria@creditosdelvalle.com', type: 'email', value: form.correo, onChange: setField('correo') },
                        { id: 'telefono', label: 'Teléfono', placeholder: '+57 300 000 0000', type: 'tel', value: form.telefono, onChange: setField('telefono') },
                      ].map(({ id, label, placeholder, type, value, onChange }) => (
                        <div key={id}>
                          <label htmlFor={id} className="block font-body text-xs font-semibold uppercase tracking-wide text-bone/50 mb-2">{label}</label>
                          <input required type={type} id={id} name={id} placeholder={placeholder} value={value} onChange={onChange}
                            className="w-full rounded-xl border border-bone/15 bg-graphite-800 px-4 py-3.5 font-body text-sm text-bone placeholder:text-bone/30 focus:border-lime focus:outline-none transition-colors" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-5">
                      <label htmlFor="subdominio" className="block font-body text-xs font-semibold uppercase tracking-wide text-bone/50 mb-2">Subdominio de tu espacio de trabajo</label>
                      <div className="flex items-stretch rounded-xl border border-bone/15 bg-graphite-800 focus-within:border-lime transition-colors overflow-hidden">
                        <input required type="text" id="subdominio" name="subdominio" placeholder="creditosdelvalle"
                          value={form.subdominio} onChange={setField('subdominio')}
                          className="w-full bg-transparent px-4 py-3.5 font-body text-sm text-bone placeholder:text-bone/30 focus:outline-none" />
                        <span className="flex items-center px-4 font-mono text-sm text-bone/40 bg-graphite-700/50 border-l border-bone/10 whitespace-nowrap">.kredipay.vercel.app</span>
                      </div>
                      {form.subdominio.trim().length >= 3 && (
                        <p className={`mt-2 font-mono text-xs ${subdisponible === false ? 'text-red-400' : subdisponible === true ? 'text-lime' : 'text-bone/40'}`}>
                          {subdisponible === false
                            ? 'Este subdominio ya está en uso.'
                            : subdisponible === true
                              ? 'Subdominio disponible.'
                              : 'Verificando...'}
                        </p>
                      )}
                    </div>
                    <div className="mt-5">
                      <div className="rounded-xl border border-lime/20 bg-lime/5 px-4 py-3 text-bone/80 font-body text-sm">
                        Enviaremos una contraseña temporal al correo registrado para tu primer acceso.
                      </div>
                    </div>
                    <div className="mt-5">
                      <label htmlFor="logo" className="block font-body text-xs font-semibold uppercase tracking-wide text-bone/50 mb-2">Logo de la empresa <span className="normal-case font-normal text-bone/30">(opcional · PNG, JPG o WebP · máx. 200 KB)</span></label>
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-bone/15 bg-graphite-800 overflow-hidden shrink-0">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Vista previa del logo" className="h-full w-full object-contain" />
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-bone/25">
                              <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <label htmlFor="logo" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-bone/20 px-5 py-2.5 font-body text-xs font-semibold text-bone hover:bg-bone/10 transition-colors">
                            {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                            <input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoFile} />
                          </label>
                          {logoPreview && (
                            <button type="button" onClick={() => { setForm((f) => ({ ...f, logo: '' })); setLogoPreview(''); }} className="ml-2 font-body text-xs text-bone/50 hover:text-red-400 transition-colors">Quitar</button>
                          )}
                          {logoError && <p className="mt-1 font-body text-xs text-red-400">{logoError}</p>}
                        </div>
                      </div>
                    </div>
                    <label className="mt-5 flex items-start gap-3 cursor-pointer">
                      <input required type="checkbox" className="mt-1 h-4 w-4 rounded border-bone/30 bg-graphite-800 accent-lime" />
                      <span className="font-body text-xs text-bone/50 leading-relaxed">
                        Acepto los <a href="#" className="text-lime hover:underline">Términos de servicio</a> y la <Link href="/politica-de-datos" className="text-lime hover:underline">Política de privacidad</Link> de Kredipay.
                      </span>
                    </label>
                    {formError && (
                      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-body text-sm text-red-400">{formError}</div>
                    )}
                    <button type="submit" disabled={formLoading} className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-full bg-lime py-4 font-display font-semibold text-emerald-950 hover:bg-bone transition-colors disabled:opacity-60">
                      {formLoading ? 'Creando tu espacio...' : 'Crear mi espacio de trabajo'}
                    </button>
                    <p className="mt-3 text-center font-mono text-xs text-bone/35">14 días de prueba gratis · Sin tarjeta de crédito</p>
                  </>
                )}
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FAQ ════════════════════════════ */}
      <section id="faq" className="relative py-24 lg:py-32 bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="relative mx-auto max-w-4xl px-6 lg:px-10">
          <div className="max-w-2xl mx-auto text-center fade-up">
            <p className="font-mono text-xs uppercase text-lime sub-eyebrow">Preguntas frecuentes</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl mt-3 text-bone leading-tight">
              Resolvemos tus dudas
            </h2>
            <p className="mt-4 font-body text-bone/65 leading-relaxed">
              Todo lo que necesitas saber antes de digitalizar la gestión de tus préstamos.
            </p>
          </div>

          <div className="mt-12 space-y-4 fade-up">
            {[
              {
                q: '¿Para quién es Kredipay?',
                a: 'Kredipay está diseñado para prestamistas, empresas de crédito, cooperativas y negocios de cobranza que quieren dejar las libretas y las hojas de cálculo. Sirve tanto al prestamista independiente como a la empresa con varios cobradores en campo.',
              },
              {
                q: '¿Puedo manejar préstamos con pago diario?',
                a: 'Sí. Configura préstamos con pago diario, semanal o mensual, y el sistema calcula automáticamente la cuota, los intereses y el saldo. Cada cliente ve sus cuotas pendientes y su avance de pago desde su propio panel.',
              },
              {
                q: '¿Cómo controlo la mora de mis clientes?',
                a: 'Kredipay marca automáticamente los días de atraso de cada préstamo y te muestra en el dashboard quién debe, cuánto y desde cuándo. Puedes enviar recordatorios y saber exactamente qué clientes están en mora para actuar a tiempo.',
              },
              {
                q: '¿Puedo asignar carteras a vendedores o agentes?',
                a: 'Sí. Cada vendedor tiene su propio usuario con acceso solo a los clientes y préstamos que le asignes. Desde tu panel ves en tiempo real lo que cada agente ha cobrado, sin que nadie pierda el control de la cartera.',
              },
              {
                q: '¿Necesito instalar algún programa?',
                a: 'No. Kredipay funciona 100% en el navegador desde tu celular, tablet o computador. Cada empresa obtiene su propio subdominio y panel independiente, listo para usar en minutos.',
              },
              {
                q: '¿Mis datos están seguros?',
                a: 'Sí. La información viaja con cifrado de extremo a extremo, se respalda automáticamente y el acceso está controlado por rol: cada usuario solo ve lo que le corresponde. Cada empresa tiene sus datos completamente aislados de las demás.',
              },
              {
                q: '¿Cuánto cuesta y hay prueba gratis?',
                a: 'Puedes probar Kredipay 14 días gratis sin tarjeta de crédito. Los planes comienzan desde $39.000/mes para prestamistas independientes y crecen según el tamaño de tu cartera. Cambia o cancela cuando quieras.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-2xl border border-bone/10 bg-graphite-900 overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-display font-semibold text-bone hover:bg-graphite-800 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm sm:text-base">{q}</span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-bone/20 text-bone/60 transition-transform duration-200 group-open:rotate-45">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </span>
                </summary>
                <p className="px-6 pb-6 font-body text-sm text-bone/65 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>

          <p className="mt-10 text-center font-body text-sm text-bone/45 fade-up">
            ¿Tienes otra pregunta?{' '}
            <a href="#registro" className="text-lime hover:underline">Habla con nuestro equipo comercial</a>.
          </p>
        </div>
      </section>

      {/* ══════════════════════════ FOOTER ════════════════════════════ */}
      <footer className="relative bg-emerald-950 border-t border-bone/10 pt-16 pb-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-10 lg:gap-8">

            <div className="col-span-2 lg:col-span-4">
              <a href="#top" className="flex items-center gap-2.5 mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <img src="/logo.webp" alt="Kredipay" className="h-8 w-8 object-contain" />
                </span>
                <span className="font-display font-bold text-lg text-bone">Kredipay</span>
              </a>
              <p className="font-body text-sm text-bone/50 leading-relaxed max-w-xs">El sistema integral para gestionar préstamos personales y a través de terceros, pensado para empresas de crédito modernas.</p>
            </div>

            <div className="lg:col-span-2">
              <h4 className="font-display font-semibold text-sm text-bone mb-4">Producto</h4>
              <ul className="space-y-3 font-body text-sm text-bone/50">
                {[['#beneficios','Beneficios'],['#planes','Planes y precios'],['#faq','Preguntas frecuentes'],['#oferta','Oferta de lanzamiento'],['#registro','Crear espacio']].map(([href, label]) => (
                  <li key={href}><a href={href} className="hover:text-lime transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="font-display font-semibold text-sm text-bone mb-4">Legal</h4>
              <ul className="space-y-3 font-body text-sm text-bone/50">
                {[['/politica-de-datos','Política de privacidad'],['#','Términos de servicio'],['/politica-de-datos','Tratamiento de datos']].map(([href, label]) => (
                  <li key={label}><Link href={href} className="hover:text-lime transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-4">
              <h4 className="font-display font-semibold text-sm text-bone mb-4">Soporte</h4>
              <ul className="space-y-3 font-body text-sm text-bone/50">
                <li className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4H20V18H4V4Z" stroke="currentColor" strokeWidth="1.6" /><path d="M4 6L12 13L20 6" stroke="currentColor" strokeWidth="1.6" /></svg>
                  soporte@kredipay.com
                </li>
                <li className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6.6 10.8C8 13.6 10.4 16 13.2 17.4L15.4 15.2C15.7 14.9 16.1 14.8 16.5 14.9C17.7 15.3 19 15.5 20.3 15.5C20.9 15.5 21.3 16 21.3 16.5V20C21.3 20.6 20.9 21 20.3 21C10.7 21 3 13.3 3 3.7C3 3.1 3.4 2.7 4 2.7H7.5C8 2.7 8.5 3.1 8.5 3.7C8.5 5 8.7 6.3 9.1 7.5C9.2 7.9 9.1 8.3 8.8 8.6L6.6 10.8Z" stroke="currentColor" strokeWidth="1.6" /></svg>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-lime transition-colors">+57 324 771 6650</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 pt-8 border-t border-bone/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-mono text-xs text-bone/35">© 2026 Kredipay. Todos los derechos reservados.</p>
            <p className="font-mono text-xs text-bone/35">Hecho para prestamistas que quieren crecer sin caos.</p>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <WhatsAppWidget />

    </div>
  );
}
