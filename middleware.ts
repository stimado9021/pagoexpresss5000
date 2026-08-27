import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'fallback-secret-key')
if (!secretKey) {
  throw new Error('SESSION_SECRET no está configurada. Revisa el archivo .env')
}
const encodedKey = new TextEncoder().encode(secretKey)

const publicPaths = ['/_next', '/api/auth', '/api/planes', '/favicon.ico', '/api/webhooks', '/api/public']
const protectedPaths = ['/admin', '/empresario', '/vendedor', '/cliente']

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')?.value

  if (!sessionCookie) {
    if (isProtected(pathname)) {
      const url = new URL('/login', request.url)
      url.searchParams.set('from', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    })
    const session = payload as unknown as { userId: number; rol: string; tenantId?: number }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', String(session.userId))
    requestHeaders.set('x-user-rol', session.rol)
    requestHeaders.set('x-pathname', pathname)
    if (session.tenantId) {
      requestHeaders.set('x-tenant-id', String(session.tenantId))
    }

    const roleHome: Record<string, string> = {
      superadmin: '/admin',
      empresario: '/empresario',
      vendedor: '/vendedor',
      cliente: '/cliente',
    }

    if (pathname === '/login' && roleHome[session.rol]) {
      return NextResponse.redirect(new URL(roleHome[session.rol], request.url))
    }

    if (isProtected(pathname)) {
      const home = roleHome[session.rol]
      if (home && pathname.startsWith(home)) {
        return NextResponse.next({ request: { headers: requestHeaders } })
      }
      return NextResponse.redirect(new URL(home ?? '/login', request.url))
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch {
    if (isProtected(pathname)) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
