export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classroomId: string }> }
): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { classroomId } = await params
  try {
    const memberships = await prisma.adminMembership.findMany({
      where: { classroomId },
      select: {
        id: true,
        adminKey: true,
        isOwner: true,
        joinedAt: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        inviteStatus: true,
        inviteSentAt: true,
        user: { select: { firstName: true, lastName: true, username: true } },
      },
    })
    const admins = memberships.map((m) => ({
      membershipId: m.id,
      adminKey: m.adminKey,
      isOwner: m.isOwner,
      claimed: m.userId !== null,
      joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
      firstName: m.user?.firstName ?? m.firstName ?? null,
      lastName: m.user?.lastName ?? m.lastName ?? null,
      username: m.user?.username ?? null,
      email: m.email,
      inviteStatus: m.inviteStatus,
      inviteSentAt: m.inviteSentAt ? m.inviteSentAt.toISOString() : null,
    }))
    return NextResponse.json({ ok: true, admins })
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
