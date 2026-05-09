import { existsSync, promises as fs } from 'fs'
import path from 'path'
import type { Lesson } from '@/lib/lessons'

// Assumes the Next.js process is started from the codelab/ directory
// (i.e. process.cwd() === codelab/). Run npm run dev from inside codelab/.
const LESSONS_DIR = path.join(process.cwd(), 'content', 'lessons')

if (!existsSync(LESSONS_DIR)) {
  throw new Error(
    'Could not find lessons directory. Run npm run dev from the codelab/ directory.',
  )
}

const LESSON_ID_RE = /^[a-z0-9-]+$/

export async function loadLessonFromDisk(
  lessonId: string,
): Promise<Lesson | null> {
  if (!LESSON_ID_RE.test(lessonId)) return null
  const filePath = path.join(LESSONS_DIR, `${lessonId}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Lesson
    return parsed
  } catch {
    return null
  }
}
