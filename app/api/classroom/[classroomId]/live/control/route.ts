import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getActiveSession, getAdminMembership } from '@/lib/live'
import { DEFAULT_LIVE_SECONDS } from '@/lib/deckTypes'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

type Body = {
  action?: unknown
  lessonId?: unknown
  exerciseIndex?: unknown
  durationSeconds?: unknown
}

function clampDuration(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_LIVE_SECONDS
  return Math.max(5, Math.min(600, Math.round(raw)))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> | { classroomId: string } },
): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { session } = auth
  const { classroomId } = await params

  const admin = await getAdminMembership(classroomId, session.userId)
  if (!admin) return jsonError(403, 'forbidden')

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonError(400, 'missing_fields')
  }

  const action = body.action
  const now = new Date()

  if (action === 'activate') {
    if (typeof body.lessonId !== 'string' || !body.lessonId) return jsonError(400, 'missing_fields')
    if (
      typeof body.exerciseIndex !== 'number' ||
      !Number.isInteger(body.exerciseIndex) ||
      body.exerciseIndex < 0
    ) {
      return jsonError(400, 'invalid_exercise_index')
    }
    const duration = clampDuration(body.durationSeconds)
    const existing = await getActiveSession(classroomId)

    // Switching lessons mid-session would make the cumulative leaderboard span
    // unrelated content — end the old session and start fresh in that case.
    if (existing && existing.lessonId === body.lessonId) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: {
          currentSlideType: 'exercise',
          currentExerciseIndex: body.exerciseIndex,
          phase: 'lobby',
          pollOpen: false,
          pollEndsAt: null,
          pollDurationSeconds: duration,
        },
      })
      return NextResponse.json({ ok: true })
    }

    if (existing) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: { endedAt: now, phase: 'idle', status: 'ended', pollOpen: false },
      })
    }
    await prisma.liveSession.create({
      data: {
        classroomId,
        instructorMembershipId: admin.id,
        lessonId: body.lessonId,
        currentSlideType: 'exercise',
        currentExerciseIndex: body.exerciseIndex,
        phase: 'lobby',
        pollOpen: false,
        pollDurationSeconds: duration,
        status: 'active',
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'focus-editor') {
    if (typeof body.lessonId !== 'string' || !body.lessonId) return jsonError(400, 'missing_fields')
    if (
      typeof body.exerciseIndex !== 'number' ||
      !Number.isInteger(body.exerciseIndex) ||
      body.exerciseIndex < 0
    ) {
      return jsonError(400, 'invalid_exercise_index')
    }
    const existing = await getActiveSession(classroomId)
    if (existing && existing.lessonId === body.lessonId) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: { currentSlideType: 'editor', currentExerciseIndex: body.exerciseIndex },
      })
      return NextResponse.json({ ok: true })
    }
    if (existing) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: { endedAt: now, phase: 'idle', status: 'ended', pollOpen: false },
      })
    }
    await prisma.liveSession.create({
      data: {
        classroomId,
        instructorMembershipId: admin.id,
        lessonId: body.lessonId,
        currentSlideType: 'editor',
        currentExerciseIndex: body.exerciseIndex,
        phase: 'idle',
        pollOpen: false,
        status: 'active',
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'exit-focus') {
    const existing = await getActiveSession(classroomId)
    if (existing) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: { currentSlideType: null },
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'start') {
    const existing = await getActiveSession(classroomId)
    if (!existing) return jsonError(409, 'no_active_session')
    const duration = existing.pollDurationSeconds ?? DEFAULT_LIVE_SECONDS
    const endsAt = new Date(now.getTime() + duration * 1000)
    await prisma.liveSession.update({
      where: { id: existing.id },
      data: { phase: 'running', pollOpen: true, pollEndsAt: endsAt, pollDurationSeconds: duration },
    })
    return NextResponse.json({ ok: true, pollEndsAt: endsAt.toISOString() })
  }

  if (action === 'reveal') {
    const existing = await getActiveSession(classroomId)
    if (!existing) return jsonError(409, 'no_active_session')
    await prisma.liveSession.update({
      where: { id: existing.id },
      data: { phase: 'revealed', pollOpen: false },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'end') {
    const existing = await getActiveSession(classroomId)
    if (existing) {
      await prisma.liveSession.update({
        where: { id: existing.id },
        data: { endedAt: now, phase: 'idle', status: 'ended', pollOpen: false },
      })
    }
    return NextResponse.json({ ok: true })
  }

  return jsonError(400, 'invalid_action')
}
