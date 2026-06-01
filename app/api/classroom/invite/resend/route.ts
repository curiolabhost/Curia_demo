import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateInviteToken } from '@/lib/invite'
import { sendInviteEmail } from '@/lib/email'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Re-send (or first-time send) an invite for an existing pending seat.
 * Body: { membershipId, role: 'STUDENT' | 'ADMIN', email? }
 * - Owner/admin gated against the seat's classroom.
 * - Rotates the invite token so any previously-sent link is invalidated.
 * - `email` is optional; if omitted, the seat's stored email is used.
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
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  let overrideEmail: string | null = null
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
      return jsonError(400, 'invalid_email')
    }
    overrideEmail = body.email.trim()
  }
  if (!membershipId) return jsonError(400, 'missing_fields')

  try {
    // Caller must be an admin of the seat's classroom; owner-only for admin seats.
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

      // Reuse the existing token so the link previewed earlier stays valid.
      const inviteToken = slot.inviteToken ?? generateInviteToken()
      await prisma.studentMembership.update({
        where: { id: slot.id },
        data: { email, inviteToken },
      })
      await sendInviteEmail({
        to: email,
        role: 'STUDENT',
        classroomName: slot.classroom.name,
        inviteeFirstName: slot.firstName,
        key: slot.studentKey,
        token: inviteToken,
      })
      await prisma.studentMembership.update({
        where: { id: slot.id },
        data: { inviteStatus: 'sent', inviteSentAt: new Date() },
      })
      return NextResponse.json({ ok: true, email }, { status: 200 })
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

    // Any instructor member of the classroom may (re)send instructor invites.
    const caller = await prisma.adminMembership.findFirst({
      where: { classroomId: slot.classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!caller) return jsonError(403, 'forbidden')

    const email = overrideEmail ?? slot.email
    if (!email) return jsonError(400, 'no_email')

    // Reuse the existing token so the link previewed earlier stays valid.
    const inviteToken = slot.inviteToken ?? generateInviteToken()
    await prisma.adminMembership.update({
      where: { id: slot.id },
      data: { email, inviteToken },
    })
    await sendInviteEmail({
      to: email,
      role: 'ADMIN',
      classroomName: slot.classroom.name,
      inviteeFirstName: slot.firstName,
      key: slot.adminKey,
      token: inviteToken,
    })
    await prisma.adminMembership.update({
      where: { id: slot.id },
      data: { inviteStatus: 'sent', inviteSentAt: new Date() },
    })
    return NextResponse.json({ ok: true, email }, { status: 200 })
  } catch (err) {
    if (err instanceof Error && err.message === 'email_not_configured') {
      return jsonError(503, 'email_not_configured')
    }
    if (err instanceof Error && err.message.startsWith('email_send_failed')) {
      console.error('[invite/resend]', err.message)
      // Surface the provider's reason so the UI can show why (e.g. Resend
      // test-mode only delivers to the account owner's own address).
      return NextResponse.json(
        { ok: false, error: 'email_send_failed', detail: err.message.replace('email_send_failed: ', '') },
        { status: 502 }
      )
    }
    console.error('[invite/resend] unexpected error', err)
    return jsonError(500, 'server_error')
  }
}
