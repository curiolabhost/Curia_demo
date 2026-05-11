import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession(req)
  if (!session) return jsonError(401, 'unauthenticated')

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, firstName: true, lastName: true, role: true },
    })
    if (!user) return jsonError(401, 'unauthenticated')

    const body: {
      ok: true
      userId: string
      username: string
      firstName: string
      lastName: string
      role: string
      impersonating?: { studentUserId: string; membershipId: string; classroomId: string }
    } = {
      ok: true,
      userId: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }
    if (session.impersonating) {
      body.impersonating = { ...session.impersonating }
    }
    return NextResponse.json(body, { status: 200 })
  } catch {
    return jsonError(500, 'server_error')
  }
}
