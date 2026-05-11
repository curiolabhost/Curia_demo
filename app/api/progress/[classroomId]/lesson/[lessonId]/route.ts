import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, isImpersonating } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'

export const runtime = 'nodejs'

type Params = { classroomId: string; lessonId: string }

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params }
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  try {
    const membership = await getMembership(session, params.classroomId)
    if (!membership) return jsonError(404, 'membership_not_found')

    const record = await prisma.lessonProgress.findUnique({
      where: {
        membershipId_lessonId: { membershipId: membership.id, lessonId: params.lessonId },
      },
      select: {
        lastExerciseIndex: true,
        lastChallengeIndex: true,
        lastMode: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      progress: record
        ? {
            lastExerciseIndex: record.lastExerciseIndex,
            lastChallengeIndex: record.lastChallengeIndex,
            lastMode: record.lastMode,
            completedAt: record.completedAt ? record.completedAt.toISOString() : null,
          }
        : null,
    })
  } catch {
    return jsonError(500, 'server_error')
  }
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
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

  const updates: {
    lastExerciseIndex?: number
    lastChallengeIndex?: number
    lastMode?: string
    completedAt?: Date | null
  } = {}

  if ('lastExerciseIndex' in body) {
    if (!isNonNegativeInt(body.lastExerciseIndex)) return jsonError(400, 'missing_fields')
    updates.lastExerciseIndex = body.lastExerciseIndex
  }
  if ('lastChallengeIndex' in body) {
    if (!isNonNegativeInt(body.lastChallengeIndex)) return jsonError(400, 'missing_fields')
    updates.lastChallengeIndex = body.lastChallengeIndex
  }
  if ('lastMode' in body) {
    if (typeof body.lastMode !== 'string') return jsonError(400, 'missing_fields')
    updates.lastMode = body.lastMode
  }
  if ('completedAt' in body) {
    if (body.completedAt === null) {
      updates.completedAt = null
    } else if (typeof body.completedAt === 'string') {
      const d = new Date(body.completedAt)
      if (Number.isNaN(d.getTime())) return jsonError(400, 'missing_fields')
      updates.completedAt = d
    } else {
      return jsonError(400, 'missing_fields')
    }
  }

  try {
    const membership = await getMembership(session, params.classroomId)
    if (!membership) return jsonError(404, 'membership_not_found')

    await prisma.lessonProgress.upsert({
      where: {
        membershipId_lessonId: { membershipId: membership.id, lessonId: params.lessonId },
      },
      create: {
        membershipId: membership.id,
        lessonId: params.lessonId,
        ...updates,
      },
      update: updates,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return jsonError(500, 'server_error')
  }
}
