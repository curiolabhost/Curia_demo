import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'
import {
  displayName,
  getActiveSession,
  getAdminMembership,
  effectivePhase,
  secondsRemaining,
} from '@/lib/live'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

const nameSelect = {
  firstName: true,
  lastName: true,
  user: { select: { firstName: true, lastName: true } },
} as const

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> | { classroomId: string } },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth
  const { classroomId } = await params

  // Caller must belong to the classroom (as admin or student).
  let viewerMembershipId: string | null = null
  if (session.role === 'ADMIN') {
    const admin = await getAdminMembership(classroomId, session.userId)
    if (!admin) return jsonError(403, 'forbidden')
  } else {
    const m = await getMembership(session, classroomId)
    if (!m) return jsonError(403, 'forbidden')
    viewerMembershipId = m.id
  }

  const sess = await getActiveSession(classroomId)
  if (!sess) return NextResponse.json({ ok: true, live: null })

  const now = new Date()
  const phase = effectivePhase(sess, now)

  // Lazily settle a timed-out poll so the stored phase matches what clients see.
  if (phase === 'revealed' && sess.phase === 'running') {
    await prisma.liveSession.updateMany({
      where: { id: sess.id, phase: 'running' },
      data: { phase: 'revealed' },
    })
  }

  const [participants, responses] = await Promise.all([
    prisma.liveParticipant.findMany({
      where: { liveSessionId: sess.id },
      orderBy: { joinedAt: 'asc' },
      select: { membershipId: true, joinedAt: true, membership: { select: nameSelect } },
    }),
    prisma.liveResponse.findMany({
      where: { liveSessionId: sess.id },
      select: {
        membershipId: true,
        exerciseIndex: true,
        isCorrect: true,
        score: true,
        submittedAt: true,
        membership: { select: nameSelect },
      },
    }),
  ])

  const exIndex = sess.currentExerciseIndex
  const currentResponses = responses.filter((r) => r.exerciseIndex === exIndex)

  // Cumulative leaderboard across the whole session.
  const totals = new Map<string, { name: string; score: number }>()
  for (const r of responses) {
    const prev = totals.get(r.membershipId)
    const name = displayName(r.membership)
    totals.set(r.membershipId, { name, score: (prev?.score ?? 0) + r.score })
  }
  const leaderboard = Array.from(totals.entries())
    .map(([membershipId, v]) => ({ membershipId, name: v.name, score: v.score }))
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const base = {
    sessionId: sess.id,
    lessonId: sess.lessonId,
    phase,
    currentSlideType: sess.currentSlideType,
    currentExerciseIndex: exIndex,
    pollEndsAt: sess.pollEndsAt ? sess.pollEndsAt.toISOString() : null,
    durationSeconds: sess.pollDurationSeconds,
    secondsRemaining: phase === 'running' ? secondsRemaining(sess, now) : 0,
    participants: participants.map((p) => ({
      membershipId: p.membershipId,
      name: displayName(p.membership),
    })),
    answeredCount: currentResponses.length,
    totalParticipants: participants.length,
  }

  if (session.role === 'ADMIN') {
    return NextResponse.json({
      ok: true,
      live: {
        ...base,
        correctCount: currentResponses.filter((r) => r.isCorrect).length,
        responses: currentResponses
          .map((r) => ({
            membershipId: r.membershipId,
            name: displayName(r.membership),
            isCorrect: r.isCorrect,
            score: r.score,
            submittedAt: r.submittedAt.toISOString(),
          }))
          .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
        leaderboard,
      },
    })
  }

  // Student view: only their own answer detail; leaderboard once revealed.
  const mine = currentResponses.find((r) => r.membershipId === viewerMembershipId)
  const myRank = leaderboard.find((l) => l.membershipId === viewerMembershipId) ?? null
  const joined = participants.some((p) => p.membershipId === viewerMembershipId)
  return NextResponse.json({
    ok: true,
    live: {
      ...base,
      you: {
        joined,
        answered: !!mine,
        isCorrect: mine?.isCorrect ?? null,
        score: mine?.score ?? 0,
        rank: myRank?.rank ?? null,
        totalScore: myRank?.score ?? 0,
      },
      leaderboard: phase === 'revealed' ? leaderboard : null,
    },
  })
}
