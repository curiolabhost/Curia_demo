import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateAdminKey } from '@/lib/keys'
import { generateInviteToken } from '@/lib/invite'

export const runtime = 'nodejs'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
  if (typeof body.classroomId !== 'string') {
    return jsonError(400, 'missing_fields')
  }
  const classroomId = body.classroomId.trim()
  if (!classroomId) return jsonError(400, 'missing_fields')

  const firstName =
    typeof body.firstName === 'string' && body.firstName.trim()
      ? body.firstName.trim()
      : null
  const lastName =
    typeof body.lastName === 'string' && body.lastName.trim()
      ? body.lastName.trim()
      : null

  // Email is optional. When present it must be a plausible address; when absent
  // the seat is created with a key for manual sharing (legacy behavior).
  let email: string | null = null
  if (body.email !== undefined && body.email !== null && body.email !== '') {
    if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
      return jsonError(400, 'invalid_email')
    }
    email = body.email.trim()
  }

  try {
    // Any instructor who belongs to this classroom may add other instructors.
    // New instructors are always created as non-owners (isOwner: false below),
    // so this does not allow granting ownership.
    const membership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!membership) {
      return jsonError(403, 'forbidden')
    }

    const adminKey = generateAdminKey()
    // Token minted up-front when an email is given; the email is sent only after
    // the owner reviews the draft (see /api/classroom/invite/*).
    const inviteToken = email ? generateInviteToken() : null
    const created = await prisma.adminMembership.create({
      data: {
        classroomId,
        adminKey,
        isOwner: false,
        firstName,
        lastName,
        email,
        inviteToken,
      },
      select: { id: true },
    })

    return NextResponse.json(
      { ok: true, adminKey, membershipId: created.id, email },
      { status: 201 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
