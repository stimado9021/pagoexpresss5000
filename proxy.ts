import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!sitemap|_next/static|_next/image|favicon.ico).*)'],
}