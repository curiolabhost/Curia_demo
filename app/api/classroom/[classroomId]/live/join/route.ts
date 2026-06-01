import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireStudent } from '@/lib/auth'
import { getMembership } from '@/lib/getMembership'
import { getActiveSession } from '@/lib/live'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

// Student joins the live room (or heartbeats their presence). Idempotent.
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

  const sess = await getActiveSession(classroomId)
  if (!sess) return NextResponse.json({ ok: true, live: null })

  const now = new Date()
  await prisma.liveParticipant.upsert({
    where: {
      liveSessionId_membershipId: { liveSessionId: sess.id, membershipId: membership.id },
    },
    create: { liveSessionId: sess.id, membershipId: membership.id, lastSeenAt: now },
    update: { lastSeenAt: now },
  })

  return NextResponse.json({ ok: true, sessionId: sess.id })
}
