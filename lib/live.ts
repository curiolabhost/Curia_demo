import { prisma } from './db'

// ---- Pulse live-session phases ----
// idle     — session row exists but nothing is activated on the current slide
// lobby    — poll activated for the current exercise; students can join, no timer yet
// running  — countdown active; students may submit until pollEndsAt
// revealed — timer ended (or teacher revealed); answers + leaderboard visible
export type LivePhase = 'idle' | 'lobby' | 'running' | 'revealed'

export const LIVE_PHASES: LivePhase[] = ['idle', 'lobby', 'running', 'revealed']

export function displayName(m: {
  firstName: string | null
  lastName: string | null
  user: { firstName: string | null; lastName: string | null } | null
}): string {
  const first = m.user?.firstName ?? m.firstName ?? ''
  const last = m.user?.lastName ?? m.lastName ?? ''
  const name = `${first} ${last}`.trim()
  return name.length > 0 ? name : 'Student'
}

export async function getAdminMembership(
  classroomId: string,
  userId: string,
): Promise<{ id: string } | null> {
  return prisma.adminMembership.findFirst({
    where: { classroomId, userId },
    select: { id: true },
  })
}

/** The one live session for a classroom that hasn't been ended yet, if any. */
export async function getActiveSession(classroomId: string) {
  return prisma.liveSession.findFirst({
    where: { classroomId, endedAt: null },
    orderBy: { startedAt: 'desc' },
  })
}

/**
 * Phase as the clients should see it. A 'running' poll whose deadline has passed
 * is treated as 'revealed' even before the teacher explicitly reveals, so a
 * dropped teacher connection can't leave students stuck answering.
 */
export function effectivePhase(
  session: { phase: string; pollEndsAt: Date | null },
  now: Date,
): LivePhase {
  if (session.phase === 'running' && session.pollEndsAt && now.getTime() >= session.pollEndsAt.getTime()) {
    return 'revealed'
  }
  return (LIVE_PHASES as string[]).includes(session.phase)
    ? (session.phase as LivePhase)
    : 'idle'
}

/** Server-authoritative seconds left in the current running poll (0 if not running). */
export function secondsRemaining(
  session: { pollEndsAt: Date | null },
  now: Date,
): number {
  if (!session.pollEndsAt) return 0
  return Math.max(0, Math.round((session.pollEndsAt.getTime() - now.getTime()) / 1000))
}
