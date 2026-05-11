import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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
  if (
    typeof body.studentUserId !== 'string' ||
    typeof body.membershipId !== 'string' ||
    typeof body.classroomId !== 'string'
  ) {
    return jsonError(400, 'missing_fields')
  }
  const studentUserId = body.studentUserId.trim()
  const membershipId = body.membershipId.trim()
  const classroomId = body.classroomId.trim()
  if (!studentUserId || !membershipId || !classroomId) {
    return jsonError(400, 'missing_fields')
  }

  if (studentUserId === session.userId) {
    return jsonError(400, 'cannot_impersonate_self')
  }

  try {
    const adminMembership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!adminMembership) return jsonError(403, 'forbidden')

    const studentMembership = await prisma.studentMembership.findFirst({
      where: { id: membershipId, classroomId, userId: studentUserId },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
      },
    })
    if (!studentMembership || !studentMembership.user) {
      return jsonError(404, 'student_not_found')
    }

    const newSession: SessionData = {
      userId: session.userId,
      role: session.role,
      impersonating: { studentUserId, membershipId, classroomId },
    }

    const response = NextResponse.json(
      {
        ok: true,
        impersonating: {
          studentUserId,
          membershipId,
          classroomId,
          firstName: studentMembership.user.firstName,
          lastName: studentMembership.user.lastName,
        },
      },
      { status: 200 }
    )
    return await setSessionCookie(response, newSession)
  } catch {
    return jsonError(500, 'server_error')
  }
}
