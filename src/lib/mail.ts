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

export async function sendCredenciales({
  to,
  nombre,
  correo,
  password,
  rol,
}: {
  to: string
  nombre: string
  correo: string
  password: string
  rol?: string
}) {
  return sendEmail({
    to,
    subject: `Tus credenciales de acceso a PagoExpress${rol ? ` (${rol})` : ''}`,
    html: layoutHtml(`
      <h1 style="font-size:20px;margin:0 0 12px;">¡Hola, ${nombre}!</h1>
      <p style="margin:0 0 16px;">Tu usuario en PagoExpress quedó listo. Estas son tus credenciales de acceso:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;background:#1e293b;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:12px 16px;color:#a8a29e;width:40%;">Correo de acceso</td>
          <td style="padding:12px 16px;text-align:right;font-family:monospace;color:#f5f5f4;">${correo}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#a8a29e;">Contraseña</td>
          <td style="padding:12px 16px;text-align:right;font-family:monospace;font-weight:700;color:#c9f24c;">${password}</td>
        </tr>
      </table>
      <a href="${appUrl}/login" style="display:inline-block;background:#c9f24c;color:#022c22;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">Ir al login</a>
      <p style="margin:20px 0 0;color:#a8a29e;font-size:12px;">Guarda esta contraseña en un lugar seguro. Si la pierdes, solicita que te la restablezcan.</p>
    `),
  })
}

export function layoutHtml(body: string): string {  return `
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
