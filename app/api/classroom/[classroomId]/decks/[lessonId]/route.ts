import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

type RouteParams = { params: Promise<{ classroomId: string; lessonId: string }> | { classroomId: string; lessonId: string } }

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  if (session.role !== 'ADMIN') return jsonError(403, 'forbidden')

  const { classroomId, lessonId } = await params

  const adminMembership = await prisma.adminMembership.findFirst({
    where: { classroomId, userId: session.userId },
    select: { id: true },
  })
  if (!adminMembership) return jsonError(403, 'forbidden')

  const row = await prisma.slidesDeck.findUnique({
    where: { classroomId_lessonId: { classroomId, lessonId } },
  })

  if (!row) return NextResponse.json({ ok: true, deck: null })

  return NextResponse.json({
    ok: true,
    deck: row.slides,
    lastEditedByUserId: row.lastEditedByUserId ?? null,
    updatedAt: row.updatedAt.toISOString(),
  })
}

export async function PUT(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error
  const { session } = auth

  if (session.role !== 'ADMIN') return jsonError(403, 'forbidden')

  const { classroomId, lessonId } = await params

  const adminMembership = await prisma.adminMembership.findFirst({
    where: { classroomId, userId: session.userId },
    select: { id: true },
  })
  if (!adminMembership) return jsonError(403, 'forbidden')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'missing_fields')
  }

  if (typeof body !== 'object' || body === null) return jsonError(400, 'missing_fields')
  const slides = (body as { slides?: unknown }).slides
  if (!Array.isArray(slides)) return jsonError(400, 'invalid_deck')

  for (const item of slides) {
    if (typeof item !== 'object' || item === null) return jsonError(400, 'invalid_deck')
    const it = item as { type?: unknown; index?: unknown; enabled?: unknown }
    if (it.type !== 'content' && it.type !== 'exercise') return jsonError(400, 'invalid_deck')
    if (typeof it.index !== 'number' || !Number.isInteger(it.index) || it.index < 0) return jsonError(400, 'invalid_deck')
    if (typeof it.enabled !== 'boolean') return jsonError(400, 'invalid_deck')
  }

  await prisma.slidesDeck.upsert({
    where: { classroomId_lessonId: { classroomId, lessonId } },
    create: { classroomId, lessonId, slides, lastEditedByUserId: session.userId },
    update: { slides, lastEditedByUserId: session.userId },
  })

  return NextResponse.json({ ok: true })
}
