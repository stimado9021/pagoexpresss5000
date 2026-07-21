import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-key'
const encodedKey = new TextEncoder().encode(secretKey)

const protectedRoutes: Record<string, string[]> = {
  '/admin': ['superadmin'],
  '/vendedor': ['vendedor'],
  '/cliente': ['cliente'],
}

const publicRoutes = ['/login', '/api/auth/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // API routes handle their own auth — let them pass
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Non-API, non-protected routes pass through
  const isProtected = Object.keys(protectedRoutes).some((route) =>
    pathname.startsWith(route)
  )
  if (!isProtected) {
    return NextResponse.next()
  }

  // Protected page routes: verify session
  const sessionCookie = request.cookies.get('session')?.value
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    })
    const session = payload as unknown as { userId: number; rol: string }

    for (const [route, roles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route) && !roles.includes(session.rol)) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
