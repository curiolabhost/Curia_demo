import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateInviteToken } from '@/lib/invite'
import { renderInvite, buildInviteUrl } from '@/lib/email'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Render the invite email for a pending seat WITHOUT sending it, so the
 * instructor can review the draft before confirming. Ensures a stable invite
 * token exists (the previewed link is the one that will actually be sent), but
 * does NOT change inviteStatus / inviteSentAt — only the real send does that.
 *
 * Body: { membershipId, role: 'STUDENT' | 'ADMIN', email? }
 */
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
    typeof body.membershipId !== 'string' ||
    (body.role !== 'STUDENT' && body.role !== 'ADMIN')
  ) {
    return jsonError(400, 'missing_fields')
  }
  const membershipId = body.membershipId.trim()
  const role = body.role
  let overrideEmail: string | null = null
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
      return jsonError(400, 'invalid_email')
    }
    overrideEmail = body.email.trim()
  }
  if (!membershipId) return jsonError(400, 'missing_fields')

  try {
    if (role === 'STUDENT') {
      const slot = await prisma.studentMembership.findUnique({
        where: { id: membershipId },
        select: {
          id: true,
          userId: true,
          studentKey: true,
          email: true,
          firstName: true,
          classroomId: true,
          inviteToken: true,
          classroom: { select: { name: true } },
        },
      })
      if (!slot) return jsonError(404, 'not_found')
      if (slot.userId !== null) return jsonError(409, 'already_claimed')

      const caller = await prisma.adminMembership.findFirst({
        where: { classroomId: slot.classroomId, userId: session.userId },
        select: { id: true },
      })
      if (!caller) return jsonError(403, 'forbidden')

      const email = overrideEmail ?? slot.email
      if (!email) return jsonError(400, 'no_email')

      let inviteToken = slot.inviteToken
      if (!inviteToken) {
        inviteToken = generateInviteToken()
        await prisma.studentMembership.update({
          where: { id: slot.id },
          data: { inviteToken },
        })
      }

      const rendered = renderInvite({
        to: email,
        role: 'STUDENT',
        classroomName: slot.classroom.name,
        inviteeFirstName: slot.firstName,
        key: slot.studentKey,
        token: inviteToken,
      })
      return NextResponse.json(
        { ok: true, to: email, link: buildInviteUrl(inviteToken), ...rendered },
        { status: 200 }
      )
    }

    // Admin seat
    const slot = await prisma.adminMembership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        userId: true,
        adminKey: true,
        email: true,
        firstName: true,
        classroomId: true,
        inviteToken: true,
        classroom: { select: { name: true } },
      },
    })
    if (!slot) return jsonError(404, 'not_found')
    if (slot.userId !== null) return jsonError(409, 'already_claimed')

    // Any instructor member of the classroom may preview instructor invites.
    const caller = await prisma.adminMembership.findFirst({
      where: { classroomId: slot.classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!caller) return jsonError(403, 'forbidden')

    const email = overrideEmail ?? slot.email
    if (!email) return jsonError(400, 'no_email')

    let inviteToken = slot.inviteToken
    if (!inviteToken) {
      inviteToken = generateInviteToken()
      await prisma.adminMembership.update({
        where: { id: slot.id },
        data: { inviteToken },
      })
    }

    const rendered = renderInvite({
      to: email,
      role: 'ADMIN',
      classroomName: slot.classroom.name,
      inviteeFirstName: slot.firstName,
      key: slot.adminKey,
      token: inviteToken,
    })
    return NextResponse.json(
      { ok: true, to: email, link: buildInviteUrl(inviteToken), ...rendered },
      { status: 200 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
