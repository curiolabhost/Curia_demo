import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { setSessionCookie, type SessionData } from '@/lib/session'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { session } = auth

  const redirectTo = session.impersonating
    ? `/admin/classroom/${session.impersonating.classroomId}`
    : '/admin'

  const newSession: SessionData = {
    userId: session.userId,
    role: session.role,
  }

  try {
    const response = NextResponse.json({ ok: true, redirectTo }, { status: 200 })
    return await setSessionCookie(response, newSession)
  } catch {
    return jsonError(500, 'server_error')
  }
}
