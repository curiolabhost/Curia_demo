import { prisma } from '@/lib/db'
import type { SessionData } from '@/lib/session'

export async function getAdminMembership(
  session: SessionData,
  classroomId: string,
): Promise<{ id: string; classroomId: string } | null> {
  if (session.role !== 'ADMIN') return null
  const membership = await prisma.adminMembership.findFirst({
    where: { classroomId, userId: session.userId },
    select: { id: true, classroomId: true },
  })
  return membership ?? null
}
