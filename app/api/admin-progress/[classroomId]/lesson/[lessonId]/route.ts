import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAdminMembership } from '@/lib/getAdminMembership'

export const runtime = 'nodejs'

type Params = { classroomId: string; lessonId: string }

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const { classroomId, lessonId } = await params

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    const record = await prisma.adminLessonProgress.findUnique({
      where: {
        adminMembershipId_lessonId: { adminMembershipId: membership.id, lessonId },
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

export async function POST(
  req: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const { classroomId, lessonId } = await params

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

  const updateData: {
    lastExerciseIndex?: number
    lastChallengeIndex?: number
    lastMode?: string
    completedAt?: Date | null
  } = {}

  if ('lastExerciseIndex' in body) {
    if (!isNonNegativeInt(body.lastExerciseIndex)) return jsonError(400, 'missing_fields')
    updateData.lastExerciseIndex = body.lastExerciseIndex
  }
  if ('lastChallengeIndex' in body) {
    if (!isNonNegativeInt(body.lastChallengeIndex)) return jsonError(400, 'missing_fields')
    updateData.lastChallengeIndex = body.lastChallengeIndex
  }
  if ('lastMode' in body) {
    if (typeof body.lastMode !== 'string') return jsonError(400, 'missing_fields')
    updateData.lastMode = body.lastMode
  }
  if ('completedAt' in body) {
    if (body.completedAt === null) {
      updateData.completedAt = null
    } else if (typeof body.completedAt === 'string') {
      const d = new Date(body.completedAt)
      if (Number.isNaN(d.getTime())) return jsonError(400, 'missing_fields')
      updateData.completedAt = d
    } else {
      return jsonError(400, 'missing_fields')
    }
  }

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    await prisma.adminLessonProgress.upsert({
      where: {
        adminMembershipId_lessonId: { adminMembershipId: membership.id, lessonId },
      },
      create: {
        adminMembershipId: membership.id,
        lessonId,
        ...updateData,
      },
      update: { ...updateData },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return jsonError(500, 'server_error')
  }
}
