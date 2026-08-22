'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

type ChatMsg = {
  id: number;
  direccion: 'entrada' | 'salida' | string;
  texto: string;
  createdAt: string;
};

const STORAGE_KEY = 'pe_chat_telefono';

const WhatsAppIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.24 3.7 8.24 8.24s-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.29z" />
  </svg>
);

export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [telefono, setTelefono] = useState<string | null>(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
  );
  const [telefonoInput, setTelefonoInput] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const telefonoRef = useRef<string | null>(null);

  useEffect(() => {
    telefonoRef.current = telefono;
  }, [telefono]);

  const cargarMensajes = useCallback(async () => {
    const tel = telefonoRef.current;
    if (!tel) return;
    try {
      const res = await fetch(`/api/chat?telefono=${encodeURIComponent(tel)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => (prev.length === data.mensajes.length ? prev : data.mensajes));
      }
    } catch {
      /* sin conexión */
    }
  }, []);

  useEffect(() => {
    if (!open || !telefono) return;
    cargarMensajes();
    const id = setInterval(cargarMensajes, 4000);
    return () => clearInterval(id);
  }, [open, telefono, cargarMensajes]);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [open, messages, sending]);

  const iniciarChat = (e: FormEvent) => {
    e.preventDefault();
    const digits = telefonoInput.replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      setError('Ingresa un número de teléfono válido (ej: 3001234567).');
      return;
    }
    setError('');
    setTelefono(digits);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, digits);
    }
    cargarMensajes();
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || !telefono || sending) return;
    setSending(true);
    setError('');
    setInput('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, texto }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.mensajes);
      } else {
        setError(data.message || 'No se pudo enviar el mensaje.');
        setInput(texto);
      }
    } catch {
      setError('Sin conexión. Intenta de nuevo.');
      setInput(texto);
    } finally {
      setSending(false);
    }
  };

  const iniciarDeNuevo = () => {
    setTelefono(null);
    setMessages([]);
    setTelefonoInput('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-bone/10 bg-graphite-900 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#075E54] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white">
                <WhatsAppIcon size={20} />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-white">Kredipay</p>
                <p className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                  Soporte en línea
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Cerrar chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {!telefono ? (
            /* Paso 1: pedir teléfono */
            <form onSubmit={iniciarChat} className="flex flex-col gap-3 bg-emerald-950/40 p-4">
              <p className="text-sm leading-relaxed text-bone/85">
                ¡Hola! 👋 Para atenderte por WhatsApp, déjanos tu número y nuestro asistente te responderá aquí mismo.
              </p>
              <input
                value={telefonoInput}
                onChange={(e) => setTelefonoInput(e.target.value)}
                type="tel"
                inputMode="numeric"
                placeholder="Número de WhatsApp, ej: 3001234567"
                className="rounded-full border border-bone/15 bg-graphite-800 px-4 py-2.5 text-sm text-bone placeholder:text-bone/35 focus:border-lime focus:outline-none"
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                className="rounded-full bg-lime px-4 py-2.5 font-display text-sm font-semibold text-emerald-950 hover:bg-bone transition-colors"
              >
                Comenzar conversación
              </button>
            </form>
          ) : (
            /* Paso 2: chat */
            <>
              <div ref={bodyRef} className="flex h-72 flex-col gap-3 overflow-y-auto bg-emerald-950/40 p-4">
                {messages.length === 0 && !sending && (
                  <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm border border-bone/10 bg-graphite-800 px-3.5 py-2.5 text-sm leading-relaxed text-bone/90">
                    ¡Hola! 👋 Escríbenos y nuestro asistente te responderá al instante.
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.direccion === 'entrada'
                        ? 'self-end rounded-tr-sm bg-lime text-emerald-950'
                        : 'self-start rounded-tl-sm border border-bone/10 bg-graphite-800 text-bone/90'
                    }`}
                  >
                    {msg.texto}
                  </div>
                ))}
                {sending && (
                  <div className="self-start flex gap-1.5 rounded-2xl rounded-tl-sm border border-bone/10 bg-graphite-800 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bone/50" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bone/50" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bone/50" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
                {error && <p className="text-center text-xs text-red-400">{error}</p>}
              </div>

              <div className="flex items-center justify-between border-t border-bone/10 bg-graphite-900 px-3 py-1.5">
                <button
                  onClick={iniciarDeNuevo}
                  className="rounded-full px-2 py-1 text-[11px] text-bone/45 hover:text-bone transition-colors"
                >
                  Cambiar número
                </button>
                <span className="font-mono text-[10px] text-bone/30">
                  Continuamos por WhatsApp: {telefono.replace(/^57/, '+57 ').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')}
                </span>
              </div>

              <form onSubmit={enviar} className="flex items-center gap-2 border-t border-bone/10 bg-graphite-900 px-3 py-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 rounded-full border border-bone/15 bg-graphite-800 px-4 py-2.5 text-sm text-bone placeholder:text-bone/35 focus:border-lime focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending}
                  aria-label="Enviar mensaje"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12H20M20 12L14 6M20 12L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar chat de WhatsApp' : 'Abrir chat de WhatsApp'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/40 hover:scale-105 transition-transform"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <WhatsAppIcon size={26} />
        )}
      </button>
    </div>
  );
}
