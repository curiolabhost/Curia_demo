import { NextRequest, NextResponse } from 'next/server'
import { findInviteByToken } from '@/lib/invite'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

/**
 * Public lookup for an invite token. Returns just enough to render the landing
 * page (classroom name, role, invitee first name, whether already claimed).
 * Never returns the student/admin key — that must come from the email.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
): Promise<NextResponse> {
  const token = (params.token ?? '').trim()
  if (!token) return jsonError(400, 'missing_token')

  try {
    const invite = await findInviteByToken(token)
    if (!invite) return jsonError(404, 'invite_not_found')

    return NextResponse.json(
      {
        ok: true,
        role: invite.role,
        classroomName: invite.classroomName,
        firstName: invite.firstName,
        claimed: invite.claimed,
      },
      { status: 200 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
