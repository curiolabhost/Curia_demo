import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

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
  if (typeof body.joinCode !== 'string' || typeof body.studentKey !== 'string') {
    return jsonError(400, 'missing_fields')
  }
  const joinCode = body.joinCode.trim()
  const studentKey = body.studentKey.trim()
  if (!joinCode || !studentKey) return jsonError(400, 'missing_fields')

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { joinCode },
      select: { id: true, name: true },
    })
    if (!classroom) return jsonError(404, 'classroom_not_found')

    const existing = await prisma.studentMembership.findFirst({
      where: { classroomId: classroom.id, userId: session.userId },
      select: { id: true },
    })
    if (existing) return jsonError(409, 'already_member')

    const slot = await prisma.studentMembership.findUnique({
      where: { classroomId_studentKey: { classroomId: classroom.id, studentKey } },
      select: { id: true, userId: true },
    })
    if (!slot) return jsonError(404, 'invalid_key')
    if (slot.userId !== null) return jsonError(409, 'key_already_used')

    const claim = await prisma.studentMembership.updateMany({
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
