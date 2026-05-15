import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { setSessionCookie, type SessionData } from '@/lib/session'

export const runtime = 'nodejs'

type LoginBody = {
  username: string
  password: string
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseBody(body: unknown): LoginBody | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (typeof b.username !== 'string' || typeof b.password !== 'string') return null
  return { username: b.username, password: b.password }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonError(400, 'missing_fields')
  }

  const parsed = parseBody(raw)
  if (!parsed) return jsonError(400, 'missing_fields')

  const username = parsed.username.trim()
  const password = parsed.password
  if (!username || !password) return jsonError(400, 'missing_fields')

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, firstName: true, lastName: true, role: true, passwordHash: true },
    })
    if (!user) return jsonError(401, 'invalid_credentials')

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return jsonError(401, 'invalid_credentials')

    const sessionData: SessionData = { userId: user.id, role: user.role }

    if (user.role === 'STUDENT') {
      const memberships = await prisma.studentMembership.findMany({
        where: { userId: user.id, NOT: { userId: null } },
        select: { id: true, classroomId: true },
      })
      if (memberships.length === 1) {
        sessionData.activeClassroomId = memberships[0].classroomId
        sessionData.activeMembershipId = memberships[0].id
      }
    }

    const response = NextResponse.json(
      {
        ok: true,
        userId: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      { status: 200 }
    )
    return await setSessionCookie(response, sessionData)
  } catch {
    return jsonError(500, 'server_error')
  }
}
