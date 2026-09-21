import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import {
  buildTenantUrl,
  getRootDomain,
  getTenantSlugFromHost,
  isReservedSubdomain,
} from './lib/domains'

const secretKey = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'fallback-secret-key')
if (!secretKey) {
  throw new Error('SESSION_SECRET no está configurada. Revisa el archivo .env')
}
const encodedKey = new TextEncoder().encode(secretKey)

// Rutas que no requieren sesión (pero sí reciben headers de tenant).
const publicPaths = ['/_next', '/api/auth', '/api/planes', '/favicon.ico', '/api/webhooks', '/api/public']
const protectedPaths = ['/admin', '/empresario', '/vendedor', '/cliente']

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

type SessionClaims = {
  userId: number
  rol: string
  tenantId?: number
  tenantSlug?: string
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 1. Tenant por subdominio (solo string, sin DB: el proxy solo hace
  //    checks optimistas; la validación segura vive en el DAL/APIs).
  const tenantSlug = getTenantSlugFromHost(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
  )

  // Subdominios reservados (www, api, ...) fuera de /api: devolver al apex.
  if (tenantSlug && isReservedSubdomain(tenantSlug) && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, `${request.nextUrl.protocol}//${getRootDomain()}`))
  }

  const withTenantHeaders = (res: NextResponse, session?: SessionClaims) => {
    res.headers.set('x-pathname', pathname)
    if (tenantSlug) res.headers.set('x-tenant-slug', tenantSlug)
    if (session?.tenantSlug) res.headers.set('x-session-tenant-slug', session.tenantSlug)
    return res
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return withTenantHeaders(NextResponse.next())
  }

  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    if (isProtected(pathname)) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', pathname)
      return withTenantHeaders(NextResponse.redirect(url))
    }
    return withTenantHeaders(NextResponse.next())
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    })
    const session = payload as unknown as SessionClaims

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(session.userId))
    requestHeaders.set('x-user-rol', session.rol)
    requestHeaders.set('x-pathname', pathname)
    if (session.tenantId) {
      requestHeaders.set('x-tenant-id', String(session.tenantId))
    }
    if (tenantSlug) {
      requestHeaders.set('x-tenant-slug', tenantSlug)
    }
    if (session.tenantSlug) {
      requestHeaders.set('x-session-tenant-slug', session.tenantSlug)
    }

    // 2. Aislamiento optimista por subdominio: si la sesión pertenece a un
    //    tenant distinto al del Host, llevar al usuario a SU espacio.
    //    (superadmin = plataforma, puede moverse libremente.)
    if (
      tenantSlug &&
      session.rol !== 'superadmin' &&
      session.tenantSlug &&
      session.tenantSlug !== tenantSlug
    ) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { success: false, message: 'No perteneces a este espacio de trabajo', expectedTenant: session.tenantSlug },
          { status: 403 },
        )
      }
      return withTenantHeaders(
        NextResponse.redirect(new URL(`${pathname}${search}`, buildTenantUrl(session.tenantSlug))),
        session,
      )
    }

    const roleHome: Record<string, string> = {
      superadmin: '/admin',
      empresario: '/empresario',
      vendedor: '/vendedor',
      cliente: '/cliente',
    }

    // 3. Desde el apex/www, llevar cada sesión a SU subdominio para que cada
    //    cliente siempre vea su espacio (misma URL en todos sus dispositivos).
    //    (superadmin y sesiones legacy sin slug se quedan donde están.)
    const ownBase =
      !tenantSlug && session.rol !== 'superadmin' && session.tenantSlug
        ? buildTenantUrl(session.tenantSlug)
        : null

    if (pathname === '/login' && roleHome[session.rol]) {
      const home = roleHome[session.rol]
      if (ownBase) {
        return withTenantHeaders(NextResponse.redirect(new URL(home, ownBase)), session)
      }
      return withTenantHeaders(NextResponse.redirect(new URL(home, request.url)), session)
    }

    if (isProtected(pathname)) {
      const home = roleHome[session.rol]
      if (ownBase) {
        // En apex/www (ownBase solo existe ahí): reubicar en el subdominio propio.
        const destino = home && !pathname.startsWith(home) ? home : `${pathname}${search}`
        return withTenantHeaders(NextResponse.redirect(new URL(destino, ownBase)), session)
      }
      if (home && pathname.startsWith(home)) {
        return withTenantHeaders(NextResponse.next({ request: { headers: requestHeaders } }), session)
      }
      return withTenantHeaders(NextResponse.redirect(new URL(home ?? '/login', request.url)), session)
    }

    return withTenantHeaders(
      NextResponse.next({
        request: { headers: requestHeaders },
      }),
      session,
    )
  } catch {
    if (isProtected(pathname)) {
      return withTenantHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }
    return withTenantHeaders(NextResponse.next())
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
