import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { findInviteByToken, safeKeyEqual } from '@/lib/invite'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Claim an invited seat. Requires the authenticated user to ALSO submit the
 * student/admin key that was printed in the invite email — the token alone is
 * never sufficient. This mirrors the manual join routes' key gate so a leaked
 * link cannot claim a seat on its own.
 */
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
  if (typeof body.token !== 'string' || typeof body.key !== 'string') {
    return jsonError(400, 'missing_fields')
  }
  const token = body.token.trim()
  const key = body.key.trim()
  if (!token || !key) return jsonError(400, 'missing_fields')

  try {
    const invite = await findInviteByToken(token)
    if (!invite) return jsonError(404, 'invite_not_found')

    // The signed-in role must match the kind of seat being claimed.
    if (invite.role !== session.role) return jsonError(403, 'role_mismatch')

    if (invite.kind === 'student') {
      const slot = await prisma.studentMembership.findUnique({
        where: { id: invite.membershipId },
        select: { id: true, userId: true, studentKey: true, classroomId: true },
      })
      if (!slot) return jsonError(404, 'invite_not_found')
      if (!safeKeyEqual(key, slot.studentKey)) return jsonError(403, 'invalid_key')
      if (slot.userId !== null) return jsonError(409, 'key_already_used')

      // Block claiming a second seat in the same classroom.
      const existing = await prisma.studentMembership.findFirst({
        where: { classroomId: slot.classroomId, userId: session.userId },
        select: { id: true },
      })
      if (existing) return jsonError(409, 'already_member')

      const claim = await prisma.studentMembership.updateMany({
        where: { id: slot.id, userId: null },
        data: {
          userId: session.userId,
          joinedAt: new Date(),
          inviteStatus: 'accepted',
        },
      })
      if (claim.count === 0) return jsonError(409, 'key_already_used')

      return NextResponse.json(
        { ok: true, role: 'STUDENT', classroomId: slot.classroomId, redirectTo: '/student/home' },
        { status: 200 }
      )
    }

    // Admin invite
    const slot = await prisma.adminMembership.findUnique({
      where: { id: invite.membershipId },
      select: { id: true, userId: true, adminKey: true, classroomId: true },
    })
    if (!slot) return jsonError(404, 'invite_not_found')
    if (!safeKeyEqual(key, slot.adminKey)) return jsonError(403, 'invalid_key')
    if (slot.userId !== null) return jsonError(409, 'key_already_used')

    const existing = await prisma.adminMembership.findFirst({
      where: { classroomId: slot.classroomId, userId: session.userId },
      select: { id: true },
    })
    if (existing) return jsonError(409, 'already_member')

    const claim = await prisma.adminMembership.updateMany({
      where: { id: slot.id, userId: null },
      data: {
        userId: session.userId,
        joinedAt: new Date(),
        inviteStatus: 'accepted',
      },
    })
    if (claim.count === 0) return jsonError(409, 'key_already_used')

    return NextResponse.json(
      {
        ok: true,
        role: 'ADMIN',
        classroomId: slot.classroomId,
        redirectTo: `/instructor/classroom/${slot.classroomId}`,
      },
      { status: 200 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
