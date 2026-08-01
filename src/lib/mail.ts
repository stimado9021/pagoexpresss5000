import 'server-only'
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

const from = process.env.EMAIL_FROM || 'PagoExpress <onboarding@resend.dev>'
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  if (!resend) {
    console.warn('[MAIL] RESEND_API_KEY no configurada — correo no enviado a', to)
    return { success: false as const, message: 'Email no configurado' }
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
  })

  if (error) {
    console.error('[MAIL] Error al enviar:', error)
    return { success: false as const, message: error.message }
  }

  return { success: true as const, id: data?.id }
}

export function layoutHtml(body: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#022c22;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
      <div style="background:#14532d;padding:24px 32px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;background:#c9f24c;display:flex;align-items:center;justify-content:center;font-weight:700;color:#022c22;">P</div>
          <span style="color:#f5f5f4;font-size:17px;font-weight:700;">PagoExpress</span>
        </div>
      </div>
      <div style="padding:32px;color:#f5f5f4;font-size:14px;line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.08);color:#a8a29e;font-size:12px;text-align:center;">
        &copy; ${new Date().getFullYear()} PagoExpress &bull; Gestión de préstamos
      </div>
    </div>
  </div>`
}

export { appUrl }
