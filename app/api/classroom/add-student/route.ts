import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateStudentKey } from '@/lib/keys'

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
    typeof body.classroomId !== 'string' ||
    typeof body.firstName !== 'string' ||
    typeof body.lastName !== 'string'
  ) {
    return jsonError(400, 'missing_fields')
  }
  const classroomId = body.classroomId.trim()
  const firstName = body.firstName.trim()
  const lastName = body.lastName.trim()
  if (!classroomId || !firstName || !lastName) {
    return jsonError(400, 'missing_fields')
  }

  try {
    const membership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!membership) return jsonError(403, 'forbidden')

    const studentKey = generateStudentKey()
    const created = await prisma.studentMembership.create({
      data: {
        classroomId,
        studentKey,
        firstName,
        lastName,
      },
      select: { id: true, firstName: true, lastName: true, studentKey: true },
    })

    return NextResponse.json(
      {
        ok: true,
        membershipId: created.id,
        firstName: created.firstName ?? firstName,
        lastName: created.lastName ?? lastName,
        studentKey: created.studentKey,
      },
      { status: 201 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
