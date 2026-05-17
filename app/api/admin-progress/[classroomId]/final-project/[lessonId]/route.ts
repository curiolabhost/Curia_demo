import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { getAdminMembership } from '@/lib/getAdminMembership'

export const runtime = 'nodejs'

type Params = { classroomId: string; lessonId: string }

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Params },
): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  const { classroomId, lessonId } = await params

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    const record = await prisma.adminFinalProjectProgress.findUnique({
      where: {
        adminMembershipId_lessonId: { adminMembershipId: membership.id, lessonId },
      },
      select: {
        activeBlockIndex: true,
        blocks: true,
        editedHtml: true,
        editedCss: true,
        completedAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      progress: record
        ? {
            activeBlockIndex: record.activeBlockIndex,
            blocks: record.blocks,
            editedHtml: record.editedHtml ?? null,
            editedCss: record.editedCss ?? null,
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

  const { classroomId, lessonId } = await params

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

  if (
    typeof body.activeBlockIndex !== 'number' ||
    !Number.isInteger(body.activeBlockIndex) ||
    body.activeBlockIndex < 0
  ) {
    return jsonError(400, 'missing_fields')
  }
  if (typeof body.blocks !== 'object' || body.blocks === null || Array.isArray(body.blocks)) {
    return jsonError(400, 'missing_fields')
  }

  let editedHtml: string | null | undefined = undefined
  if ('editedHtml' in body) {
    if (body.editedHtml === null || typeof body.editedHtml === 'string') {
      editedHtml = body.editedHtml
    } else {
      return jsonError(400, 'missing_fields')
    }
  }
  let editedCss: string | null | undefined = undefined
  if ('editedCss' in body) {
    if (body.editedCss === null || typeof body.editedCss === 'string') {
      editedCss = body.editedCss
    } else {
      return jsonError(400, 'missing_fields')
    }
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

  const activeBlockIndex = body.activeBlockIndex
  const blocks = body.blocks as Prisma.InputJsonValue

  try {
    const membership = await getAdminMembership(session, classroomId)
    if (!membership) return jsonError(403, 'forbidden')

    await prisma.adminFinalProjectProgress.upsert({
      where: {
        adminMembershipId_lessonId: { adminMembershipId: membership.id, lessonId },
      },
      create: {
        adminMembershipId: membership.id,
        lessonId,
        activeBlockIndex,
        blocks,
        ...(editedHtml !== undefined ? { editedHtml } : {}),
        ...(editedCss !== undefined ? { editedCss } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
      update: {
        activeBlockIndex,
        blocks,
        ...(editedHtml !== undefined ? { editedHtml } : {}),
        ...(editedCss !== undefined ? { editedCss } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return jsonError(500, 'server_error')
  }
}
