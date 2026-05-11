import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

type Params = { classroomId: string }

type LessonSummary = {
  lessonId: string
  lastExerciseIndex: number
  completedAt: string | null
}

type StudentSummary = {
  userId: string
  firstName: string
  lastName: string
  membershipId: string
  lessons: LessonSummary[]
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params }
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

    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        name: true,
        studentMemberships: {
          where: { userId: { not: null } },
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            user: { select: { firstName: true, lastName: true } },
            lessonProgress: {
              select: {
                lessonId: true,
                lastExerciseIndex: true,
                completedAt: true,
              },
            },
          },
        },
      },
    })
    if (!classroom) return jsonError(404, 'classroom_not_found')

    const students: StudentSummary[] = classroom.studentMemberships
      .filter((m): m is typeof m & { userId: string } => m.userId !== null)
      .map((m) => ({
        userId: m.userId,
        firstName: m.user?.firstName ?? m.firstName ?? '',
        lastName: m.user?.lastName ?? m.lastName ?? '',
        membershipId: m.id,
        lessons: m.lessonProgress.map((lp) => ({
          lessonId: lp.lessonId,
          lastExerciseIndex: lp.lastExerciseIndex,
          completedAt: lp.completedAt ? lp.completedAt.toISOString() : null,
        })),
      }))

    return NextResponse.json({
      ok: true,
      students,
      classroomName: classroom.name,
    })
  } catch {
    return jsonError(500, 'server_error')
  }
}
