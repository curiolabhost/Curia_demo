import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'
import { getActiveSession, effectivePhase, secondsRemaining } from '@/lib/live'
import { computeScore } from '@/lib/liveScore'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

type Body = { exerciseIndex?: unknown; isCorrect?: unknown; answer?: unknown }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> | { classroomId: string } },
): Promise<NextResponse> {
  const auth = await requireStudent(req)
  if (auth.error) return auth.error
  const { session } = auth
  const { classroomId } = await params

  const membership = await getMembership(session, classroomId)
  if (!membership) return jsonError(403, 'forbidden')

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return jsonError(400, 'missing_fields')
  }
  if (typeof body.isCorrect !== 'boolean') return jsonError(400, 'missing_fields')
  if (
    typeof body.exerciseIndex !== 'number' ||
    !Number.isInteger(body.exerciseIndex) ||
    body.exerciseIndex < 0
  ) {
    return jsonError(400, 'invalid_exercise_index')
  }

  const sess = await getActiveSession(classroomId)
  if (!sess) return jsonError(409, 'no_active_session')

  const now = new Date()
  const phase = effectivePhase(sess, now)
  if (phase !== 'running') return jsonError(409, 'poll_not_open')
  if (sess.currentExerciseIndex !== body.exerciseIndex) return jsonError(409, 'wrong_exercise')

  const remaining = secondsRemaining(sess, now)
  const score = computeScore(body.isCorrect, sess.pollDurationSeconds, remaining)
  const answer =
    body.answer === undefined ? Prisma.JsonNull : (body.answer as Prisma.InputJsonValue)

  try {
    await prisma.liveResponse.create({
      data: {
        liveSessionId: sess.id,
        membershipId: membership.id,
        lessonId: sess.lessonId,
        exerciseIndex: body.exerciseIndex,
        isCorrect: body.isCorrect,
        answer,
        score,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return jsonError(409, 'already_answered')
    }
    return jsonError(500, 'server_error')
  }

  // Make sure a fast answerer who never hit the lobby still shows up as present.
  await prisma.liveParticipant.upsert({
    where: {
      liveSessionId_membershipId: { liveSessionId: sess.id, membershipId: membership.id },
    },
    create: { liveSessionId: sess.id, membershipId: membership.id, lastSeenAt: now },
    update: { lastSeenAt: now },
  })

  return NextResponse.json({ ok: true, score })
}
