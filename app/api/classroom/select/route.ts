import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { setSessionCookie, type SessionData } from '@/lib/session'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonError(400, 'missing_fields')
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return jsonError(400, 'missing_fields')
  }
  const body = raw as Record<string, unknown>
  if (typeof body.classroomId !== 'string' || !body.classroomId) {
    return jsonError(400, 'missing_fields')
  }
  const classroomId = body.classroomId

  if (session.role === 'ADMIN') {
    const membership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { id: true, classroomId: true },
    })
    if (!membership) return jsonError(404, 'membership_not_found')
    const newSession: SessionData = {
      ...session,
      activeClassroomId: membership.classroomId,
      activeMembershipId: membership.id,
    }
    const response = NextResponse.json({
      ok: true,
      classroomId: membership.classroomId,
      role: 'ADMIN',
    })
    return await setSessionCookie(response, newSession)
  }

  try {
    const membership = await prisma.studentMembership.findUnique({
      where: { userId_classroomId: { userId: session.userId, classroomId } },
      select: { id: true, classroomId: true },
    })
    if (!membership) return jsonError(404, 'membership_not_found')

    const newSession: SessionData = {
      ...session,
      activeClassroomId: membership.classroomId,
      activeMembershipId: membership.id,
    }

    const response = NextResponse.json(
      { ok: true, classroomId: membership.classroomId, membershipId: membership.id },
      { status: 200 }
    )
    return await setSessionCookie(response, newSession)
  } catch {
    return jsonError(500, 'server_error')
  }
}
