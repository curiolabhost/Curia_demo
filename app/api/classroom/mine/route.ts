import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

type ClassroomEntry = {
  classroomId: string
  name: string
  role: 'STUDENT' | 'ADMIN'
  isOwner?: boolean
  joinedAt: string
  joinCode: string
  subject: string | null
  description: string | null
  studentCount: number
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  try {
    const classrooms: ClassroomEntry[] = []

    if (session.role === 'STUDENT') {
      const memberships = await prisma.studentMembership.findMany({
        where: { userId: session.userId, joinedAt: { not: null } },
        select: {
          joinedAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              joinCode: true,
              subject: true,
              description: true,
              _count: { select: { studentMemberships: true } },
            },
          },
        },
      })
      for (const m of memberships) {
        if (!m.joinedAt) continue
        classrooms.push({
          classroomId: m.classroom.id,
          name: m.classroom.name,
          role: 'STUDENT',
          joinedAt: m.joinedAt.toISOString(),
          joinCode: m.classroom.joinCode,
          subject: m.classroom.subject,
          description: m.classroom.description,
          studentCount: m.classroom._count.studentMemberships,
        })
      }
    } else {
      const memberships = await prisma.adminMembership.findMany({
        where: { userId: session.userId, joinedAt: { not: null } },
        select: {
          isOwner: true,
          joinedAt: true,
          classroom: {
            select: {
              id: true,
              name: true,
              joinCode: true,
              subject: true,
              description: true,
              _count: { select: { studentMemberships: true } },
            },
          },
        },
      })
      for (const m of memberships) {
        if (!m.joinedAt) continue
        classrooms.push({
          classroomId: m.classroom.id,
          name: m.classroom.name,
          role: 'ADMIN',
          isOwner: m.isOwner,
          joinedAt: m.joinedAt.toISOString(),
          joinCode: m.classroom.joinCode,
          subject: m.classroom.subject,
          description: m.classroom.description,
          studentCount: m.classroom._count.studentMemberships,
        })
      }
    }

    return NextResponse.json({ ok: true, classrooms }, { status: 200 })
  } catch {
    return jsonError(500, 'server_error')
  }
}
