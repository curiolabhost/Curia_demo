import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAdminMembership } from '@/lib/getAdminMembership'

export const runtime = 'nodejs'

const ALLOWED_FORMATS = new Set([
  'fill-blank',
  'fill-blank-typed',
  'multiple-choice',
  'drag-reorder',
  'sort-buckets',
])

type Params = { classroomId: string; lessonId: string; exerciseIndex: string }

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseIndex(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 0) return null
  return n
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const { classroomId, lessonId, exerciseIndex } = await params

  const parsedIndex = parseIndex(exerciseIndex)
  if (parsedIndex === null) return jsonError(400, 'invalid_index')

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    const record = await prisma.adminExerciseProgress.findUnique({
      where: {
        adminMembershipId_lessonId_exerciseIndex: {
          adminMembershipId: membership.id,
          lessonId,
          exerciseIndex: parsedIndex,
        },
      },
      select: {
        format: true,
        answerState: true,
        completed: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      progress: record
        ? {
            format: record.format,
            answerState: record.answerState,
            completed: record.completed,
            completedAt: record.completedAt ? record.completedAt.toISOString() : null,
          }
        : null,
    })
  } catch {
    return jsonError(500, 'server_error')
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const { classroomId, lessonId, exerciseIndex } = await params

  const parsedIndex = parseIndex(exerciseIndex)
  if (parsedIndex === null) return jsonError(400, 'invalid_index')

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonError(400, 'missing_fields')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return jsonError(400, 'missing_fields')
  }
  const body = raw as Record<string, unknown>

  if (typeof body.format !== 'string' || !ALLOWED_FORMATS.has(body.format)) {
    return jsonError(400, 'invalid_format')
  }
  if (typeof body.answerState !== 'object' || body.answerState === null) {
    return jsonError(400, 'missing_fields')
  }
  if (typeof body.completed !== 'boolean') {
    return jsonError(400, 'missing_fields')
  }

  let completedAt: Date | null | undefined = undefined
  if ('completedAt' in body) {
    if (body.completedAt === null) {
      completedAt = null
    } else if (typeof body.completedAt === 'string') {
      const d = new Date(body.completedAt)
      if (Number.isNaN(d.getTime())) return jsonError(400, 'missing_fields')
      completedAt = d
    } else {
      return jsonError(400, 'missing_fields')
    }
  }

  const format = body.format
  const answerState = body.answerState as Prisma.InputJsonValue
  const completed = body.completed

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    await prisma.adminExerciseProgress.upsert({
      where: {
        adminMembershipId_lessonId_exerciseIndex: {
          adminMembershipId: membership.id,
          lessonId,
          exerciseIndex: parsedIndex,
        },
      },
      create: {
        adminMembershipId: membership.id,
        lessonId,
        exerciseIndex: parsedIndex,
        format,
        answerState,
        completed,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
      update: {
        format,
        answerState,
        completed,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return jsonError(500, 'server_error')
  }
}
