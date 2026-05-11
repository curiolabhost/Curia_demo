import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { verifyPassword } from '@/lib/password'

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
    typeof body.classroomKey !== 'string' ||
    typeof body.adminKey !== 'string' ||
    typeof body.password !== 'string'
  ) {
    return jsonError(400, 'missing_fields')
  }
  const classroomKey = body.classroomKey.trim()
  const adminKey = body.adminKey.trim()
  const password = body.password
  if (!classroomKey || !adminKey || !password) {
    return jsonError(400, 'missing_fields')
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    })
    if (!user) return jsonError(401, 'invalid_password')

    const passwordOk = await verifyPassword(password, user.passwordHash)
    if (!passwordOk) return jsonError(401, 'invalid_password')

    const classroom = await prisma.classroom.findUnique({
      where: { classroomKey },
      select: { id: true, name: true },
    })
    if (!classroom) return jsonError(404, 'classroom_not_found')

    const slot = await prisma.adminMembership.findUnique({
      where: { classroomId_adminKey: { classroomId: classroom.id, adminKey } },
      select: { id: true, userId: true },
    })
    if (!slot) return jsonError(404, 'invalid_key')
    if (slot.userId !== null) return jsonError(409, 'key_already_used')

    const claim = await prisma.adminMembership.updateMany({
      where: { id: slot.id, userId: null },
      data: { userId: session.userId, joinedAt: new Date() },
    })
    if (claim.count === 0) return jsonError(409, 'key_already_used')

    return NextResponse.json(
      {
        ok: true,
        classroomId: classroom.id,
        classroomName: classroom.name,
        membershipId: slot.id,
      },
      { status: 200 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
