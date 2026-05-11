import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

type StudentEntry = {
  membershipId: string
  firstName: string
  lastName: string
  username: string | null
  userId: string | null
  claimed: boolean
  joinedAt: string | null
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { classroomId: string } }
): Promise<NextResponse> {
  const auth = await requireAdmin(req)
  if (auth.error) return auth.error
  const { session } = auth

  const classroomId = params.classroomId
  if (!classroomId) return jsonError(400, 'missing_fields')

  try {
    const adminMembership = await prisma.adminMembership.findFirst({
      where: { classroomId, userId: session.userId },
      select: { id: true },
    })
    if (!adminMembership) return jsonError(403, 'forbidden')

    const memberships = await prisma.studentMembership.findMany({
      where: { classroomId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        joinedAt: true,
        user: { select: { firstName: true, lastName: true, username: true } },
      },
    })

    const students: StudentEntry[] = memberships.map((m) => {
      const claimed = m.userId !== null && m.user !== null
      const firstName = m.user?.firstName ?? m.firstName ?? ''
      const lastName = m.user?.lastName ?? m.lastName ?? ''
      const username = m.user?.username ?? null
      return {
        membershipId: m.id,
        firstName,
        lastName,
        username,
        userId: m.userId,
        claimed,
        joinedAt: m.joinedAt ? m.joinedAt.toISOString() : null,
      }
    })

    return NextResponse.json({ ok: true, students }, { status: 200 })
  } catch {
    return jsonError(500, 'server_error')
  }
}
