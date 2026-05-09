import { existsSync, promises as fs } from 'fs'
import path from 'path'
import { assertEditAllowed } from '@/lib/admin/gate'
import { listLessonIds } from '@/lib/admin/listLessonIds'
import { validateDraft } from '@/lib/admin/validateDraft'

export const runtime = 'nodejs'

// Assumes the Next.js process is started from the codelab/ directory
// (i.e. process.cwd() === codelab/). Run npm run dev from inside codelab/.
const LESSONS_DIR = path.join(process.cwd(), 'content', 'lessons')

if (!existsSync(LESSONS_DIR)) {
  throw new Error(
    'Could not find lessons directory. Run npm run dev from the codelab/ directory.',
  )
}

const LESSON_ID_RE = /^[a-z0-9-]+$/

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export async function POST(req: Request): Promise<Response> {
  const gate = assertEditAllowed()
  if (!gate.ok) {
    return new Response(null, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse(400, { ok: false, error: 'bad_request' })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return jsonResponse(400, { ok: false, error: 'bad_request' })
  }
  const payload = body as { lessonId?: unknown; lesson?: unknown }

  if (
    typeof payload.lessonId !== 'string' ||
    !LESSON_ID_RE.test(payload.lessonId)
  ) {
    return jsonResponse(400, { ok: false, error: 'bad_lesson_id' })
  }
  const lessonId = payload.lessonId

  if (
    typeof payload.lesson !== 'object' ||
    payload.lesson === null ||
    Array.isArray(payload.lesson)
  ) {
    return jsonResponse(400, { ok: false, error: 'bad_request' })
  }
  const lesson = payload.lesson as Record<string, unknown>

  let allowed: string[]
  try {
    allowed = await listLessonIds()
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: 'write_failed',
      message: err instanceof Error ? err.message : String(err),
    })
  }
  if (!allowed.includes(lessonId)) {
    return jsonResponse(404, { ok: false, error: 'unknown_lesson' })
  }

  if (lesson.id !== lessonId) {
    return jsonResponse(400, { ok: false, error: 'id_mismatch' })
  }

  const result = validateDraft(lesson)
  if (!result.ok) {
    return jsonResponse(422, {
      ok: false,
      error: 'invalid_lesson',
      issues: result.errors,
    })
  }

  const filePath = path.join(LESSONS_DIR, `${lessonId}.json`)
  try {
    await fs.writeFile(filePath, JSON.stringify(lesson, null, 2), 'utf8')
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: 'write_failed',
      message: err instanceof Error ? err.message : String(err),
    })
  }

  return jsonResponse(200, { ok: true })
}
