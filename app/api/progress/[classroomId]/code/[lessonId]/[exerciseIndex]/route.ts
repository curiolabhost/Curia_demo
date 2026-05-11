import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, isImpersonating } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'

export const runtime = 'nodejs'

type Params = { classroomId: string; lessonId: string; exerciseIndex: string }

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseExerciseIndex(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params }
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const exerciseIndex = parseExerciseIndex(params.exerciseIndex)
  if (exerciseIndex === null) return jsonError(400, 'invalid_exercise_index')

  try {
    const membership = await getMembership(session, params.classroomId)
    if (!membership) return jsonError(404, 'membership_not_found')

    const record = await prisma.codeEditorState.findUnique({
      where: {
        membershipId_lessonId_exerciseIndex: {
          membershipId: membership.id,
          lessonId: params.lessonId,
          exerciseIndex,
        },
      },
      select: { code: true, completed: true, completedAt: true },
    })

    return NextResponse.json({
      ok: true,
      progress: record
        ? {
            code: record.code,
            completed: record.completed,
            completedAt: record.completedAt ? record.completedAt.toISOString() : null,
          }
        : null,
    })
  } catch {
    return jsonError(500, 'server_error')
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Params }
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  if (isImpersonating(session)) {
    return jsonError(403, 'read_only')
  }

  const exerciseIndex = parseExerciseIndex(params.exerciseIndex)
  if (exerciseIndex === null) return jsonError(400, 'invalid_exercise_index')

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

  if (typeof body.code !== 'string') return jsonError(400, 'missing_fields')
  if (typeof body.completed !== 'boolean') return jsonError(400, 'missing_fields')

  let completedAt: Date | null | undefined = undefined
  if ('completedAt' in body) {
    if (body.completedAt === null) {
      completedAt = null
    } else if (typeof body.completedAt === 'string') {
      const d = new Date(body.completedAt)
      if (Number.isNaN(d.getTime())) return jsonError(400, 'missing_fields')
      completedAt = d
    } else {
      return jsonError(400, 'missing_fields')
    }
  }

  const code = body.code
  const completed = body.completed

  try {
    const membership = await getMembership(session, params.classroomId)
    if (!membership) return jsonError(404, 'membership_not_found')

    await prisma.codeEditorState.upsert({
      where: {
        membershipId_lessonId_exerciseIndex: {
          membershipId: membership.id,
          lessonId: params.lessonId,
          exerciseIndex,
        },
      },
      create: {
        membershipId: membership.id,
        lessonId: params.lessonId,
        exerciseIndex,
        code,
        completed,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
      update: {
        code,
        completed,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return jsonError(500, 'server_error')
  }
}
