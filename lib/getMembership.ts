import { prisma } from './db'
import { type SessionData } from './session'
import { getEffectiveUserId } from './auth'

export async function getMembership(
  session: SessionData,
  classroomId: string
): Promise<{ id: string } | null> {
  const userId = getEffectiveUserId(session)
  return prisma.studentMembership.findUnique({
    where: { userId_classroomId: { userId, classroomId } },
    select: { id: true },
  })
}
