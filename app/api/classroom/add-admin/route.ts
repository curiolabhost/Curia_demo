import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateAdminKey } from '@/lib/keys'

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
  if (typeof body.classroomId !== 'string') {
    return jsonError(400, 'missing_fields')
  }
  const classroomId = body.classroomId.trim()
  if (!classroomId) return jsonError(400, 'missing_fields')

  try {
    const membership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { isOwner: true },
    })
    if (!membership || !membership.isOwner) {
      return jsonError(403, 'not_owner')
    }

    const adminKey = generateAdminKey()
    await prisma.adminMembership.create({
      data: {
        classroomId,
        adminKey,
        isOwner: false,
      },
    })

    return NextResponse.json({ ok: true, adminKey }, { status: 201 })
  } catch {
    return jsonError(500, 'server_error')
  }
}
