import { NextResponse, type NextRequest } from 'next/server'
import { assertEditAllowed } from '@/lib/admin/gate'

const SESSION_PROTECTED_PREFIXES = ['/learn/', '/student/', '/instructor/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const gate = assertEditAllowed()
    if (!gate.ok) {
      return new NextResponse(null, { status: 404 })
    }
    return NextResponse.next()
  }

  if (SESSION_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const session = request.cookies.get('curia_session')
    if (!session || !session.value) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/learn/:path*',
    '/student/:path*',
    '/instructor/:path*',
  ],
}
