import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { generateAdminKey, generateJoinCode } from '@/lib/keys'

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
  if (typeof body.name !== 'string') {
    return jsonError(400, 'missing_fields')
  }
  const name = body.name.trim()
  if (!name) return jsonError(400, 'missing_fields')
  if (name.length < 2 || name.length > 50) {
    return jsonError(400, 'invalid_name')
  }

  try {
    const joinCode = generateJoinCode(name)
    const adminKey = generateAdminKey()

    const classroom = await prisma.classroom.create({
      data: {
        name,
        joinCode,
        adminMemberships: {
          create: {
            userId: session.userId,
            adminKey,
            isOwner: true,
            joinedAt: new Date(),
          },
        },
      },
      select: { id: true, name: true, joinCode: true },
    })

    return NextResponse.json(
      {
        ok: true,
        classroomId: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        adminKey,
      },
      { status: 201 }
    )
  } catch {
    return jsonError(500, 'server_error')
  }
}
