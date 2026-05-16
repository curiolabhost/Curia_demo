import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'

export const runtime = 'nodejs'

type Params = { classroomId: string }

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

    const rows = await prisma.lessonProgress.findMany({
      where: { membershipId: membership.id },
      select: {
        lessonId: true,
        lastExerciseIndex: true,
        lastChallengeIndex: true,
        lastMode: true,
        completedAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      lessons: rows.map((r) => ({
        lessonId: r.lessonId,
        lastExerciseIndex: r.lastExerciseIndex,
        lastChallengeIndex: r.lastChallengeIndex,
        lastMode: r.lastMode,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        updatedAt: r.updatedAt.toISOString(),
      })),
    })
  } catch {
    return jsonError(500, 'server_error')
  }
}
