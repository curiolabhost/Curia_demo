import { NextResponse } from 'next/server'
import { assertEditAllowed } from '@/lib/admin/gate'

export function middleware() {
  const gate = assertEditAllowed()
  if (!gate.ok) {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
