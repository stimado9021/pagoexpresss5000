import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'
import { rateLimit, getClientIp, isAccountLocked, recordFailedAttempt, resetFailedAttempts, getLockoutRemainingMs } from '@/lib/rate-limit'
import { buildTenantUrl, normalizeSubdomainSlug } from '@/lib/domains'
import { resolveTenantByHost } from '@/lib/tenant-guard'
import bcrypt from 'bcryptjs'

type Candidate = {
  id: number
  cedula: string
  nombre: string
  apellido: string
  rol: string
  email: string | null
  password: string
  activo: number
  tenantId: number | null
}

async function tenantSlugOf(tenantId: number | null): Promise<string | undefined> {
  if (!tenantId) return undefined
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } })
  return t?.slug
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      return NextResponse.json({ success: false, message: 'Demasiados intentos. Espera un minuto.' }, { status: 429 })
    }

    const { email, password, subdomain } = await request.json()
    const query = String(email ?? '').trim().toLowerCase()

    if (!query || !password) {
      return NextResponse.json({ success: false, message: 'Correo y contraseña requeridos' }, { status: 400 })
    }

    const accountKey = `login:${query}`
    if (isAccountLocked(accountKey)) {
      const remainingSec = Math.ceil(getLockoutRemainingMs(accountKey) / 1000)
      return NextResponse.json({ success: false, message: `Cuenta bloqueada temporalmente. Intenta en ${remainingSec} segundos.` }, { status: 429 })
    }

    // Contexto de espacio de trabajo: subdominio del Host o el que envía el cliente.
    const explicitSlug = normalizeSubdomainSlug(String(subdomain ?? ''))
    let tenantCtx: { id: number; slug: string; nombre: string } | null = null
    if (explicitSlug) {
      const t = await prisma.tenant.findUnique({
        where: { slug: explicitSlug },
        select: { id: true, slug: true, nombre: true },
      })
      if (t) tenantCtx = t
    }
    if (!tenantCtx) {
      const t = await resolveTenantByHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'))
      if (t) tenantCtx = { id: t.id, slug: t.slug, nombre: t.nombre }
    }

    const candidates = (await prisma.usuario.findMany({
      where: { email: query },
      take: 10,
    })) as Candidate[]

    if (candidates.length === 0) {
      const { logSecurityEvent } = await import('@/lib/security-log')
      await logSecurityEvent('AUTH_FAILURE', { email: query, ip, reason: 'user_not_found' })
      recordFailedAttempt(accountKey)
      return NextResponse.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 })
    }

    const valid: Candidate[] = []
    for (const c of candidates) {
      if (await bcrypt.compare(password, c.password)) valid.push(c)
    }

    if (valid.length === 0) {
      recordFailedAttempt(accountKey)
    }

    if (tenantCtx) {
      // Dentro de un subdominio solo entra quien pertenece a ese tenant
      // (superadmin = plataforma, puede entrar en cualquiera).
      const inScope = valid.find((c) => c.rol === 'superadmin' || c.tenantId === tenantCtx!.id)
      if (!inScope) {
        if (valid.length > 0) {
          const otherTenantId = valid[0].tenantId
          const otherSlug = await tenantSlugOf(otherTenantId)
          return NextResponse.json(
            {
              success: false,
              message: 'Esta cuenta pertenece a otro espacio de trabajo',
              otroEspacio: otherSlug ? { slug: otherSlug, url: buildTenantUrl(otherSlug) } : undefined,
            },
            { status: 403 },
          )
        }
        return NextResponse.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 })
      }
      return loginOk(inScope)
    }

    // Desde el apex: si el correo vive en varios tenants, pedir que elija espacio.
    const scoped = valid.filter((c) => c.rol !== 'superadmin')
    if (valid.length === 0) {
      return NextResponse.json({ success: false, message: 'Credenciales incorrectas' }, { status: 401 })
    }
    if (scoped.length > 1) {
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: scoped.map((c) => c.tenantId!) } },
        select: { id: true, slug: true, nombre: true },
      })
      return NextResponse.json(
        {
          success: false,
          message: 'Tu correo está en varios espacios de trabajo. Elige uno.',
          needTenant: true,
          spaces: tenants.map((t) => ({ slug: t.slug, nombre: t.nombre, url: buildTenantUrl(t.slug) })),
        },
        { status: 409 },
      )
    }
    return loginOk(valid[0])
  } catch {
    return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
  }
}

async function loginOk(user: Candidate) {
  resetFailedAttempts(`login:${user.email}`)

  if (!user.activo) {
    return NextResponse.json({ success: false, message: 'Usuario inactivo' }, { status: 403 })
  }

  const slug = await tenantSlugOf(user.tenantId)

  // Empresa bloqueada (trial vencido, suspendida o cancelada): vendedores y
  // clientes no entran hasta que se pague. El empresario sí entra para pagar
  // (su layout lo lleva a facturación) y el superadmin siempre entra.
  if (user.tenantId && (user.rol === 'vendedor' || user.rol === 'cliente')) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true, trialEndsAt: true },
    })
    const vencido = tenant?.status === 'TRIAL' && tenant.trialEndsAt < new Date()
    if (tenant && (['TRIAL_EXPIRED', 'SUSPENDED', 'CANCELLED'].includes(tenant.status) || vencido)) {
      return NextResponse.json(
        { success: false, message: 'Tu empresa suspendió el servicio. Pide a tu administrador que active la suscripción.' },
        { status: 403 },
      )
    }
  }

  await createSession({
    id: user.id,
    cedula: user.cedula,
    rol: user.rol,
    nombre: user.nombre,
    apellido: user.apellido,
    tenantId: user.tenantId,
    tenantSlug: user.rol === 'superadmin' ? undefined : slug,
  })

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      cedula: user.cedula,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: slug,
    },
    ...(slug ? { tenant: { slug, url: buildTenantUrl(slug) } } : {}),
  })
}
