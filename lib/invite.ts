import { randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'

/**
 * Opaque, unguessable invite token stored on a membership row. The token only
 * identifies which classroom/seat an invite points at — it is NOT sufficient to
 * claim a seat on its own. The invitee must additionally enter the student/admin
 * key that was printed in the invite email (see /api/invite/accept).
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Constant-time string comparison to avoid leaking key bytes via timing. */
export function safeKeyEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export type InviteLookup =
  | {
      kind: 'student'
      membershipId: string
      classroomId: string
      classroomName: string
      role: 'STUDENT'
      firstName: string | null
      lastName: string | null
      claimed: boolean
      status: string
    }
  | {
      kind: 'admin'
      membershipId: string
      classroomId: string
      classroomName: string
      role: 'ADMIN'
      firstName: string | null
      lastName: string | null
      claimed: boolean
      status: string
    }
  | null

/**
 * Resolve an invite token to its seat by checking both membership tables.
 * Tokens are 32 random bytes, so cross-table collisions are not a concern.
 * Never returns the underlying student/admin key.
 */
export async function findInviteByToken(token: string): Promise<InviteLookup> {
  if (!token) return null

  const student = await prisma.studentMembership.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      inviteStatus: true,
      classroom: { select: { id: true, name: true } },
    },
  })
  if (student) {
    return {
      kind: 'student',
      membershipId: student.id,
      classroomId: student.classroom.id,
      classroomName: student.classroom.name,
      role: 'STUDENT',
      firstName: student.firstName,
      lastName: student.lastName,
      claimed: student.userId !== null,
      status: student.inviteStatus,
    }
  }

  const admin = await prisma.adminMembership.findUnique({
    where: { inviteToken: token },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      inviteStatus: true,
      classroom: { select: { id: true, name: true } },
    },
  })
  if (admin) {
    return {
      kind: 'admin',
      membershipId: admin.id,
      classroomId: admin.classroom.id,
      classroomName: admin.classroom.name,
      role: 'ADMIN',
      firstName: admin.firstName,
      lastName: admin.lastName,
      claimed: admin.userId !== null,
      status: admin.inviteStatus,
    }
  }

  return null
}
