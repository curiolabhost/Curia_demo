import { existsSync, promises as fs } from 'fs'
import path from 'path'

// Assumes the Next.js process is started from the codelab/ directory
// (i.e. process.cwd() === codelab/). Run npm run dev from inside codelab/.
const LESSONS_DIR = path.join(process.cwd(), 'content', 'lessons')

if (!existsSync(LESSONS_DIR)) {
  throw new Error(
    'Could not find lessons directory. Run npm run dev from the codelab/ directory.',
  )
}

export async function listLessonIds(): Promise<string[]> {
  const entries = await fs.readdir(LESSONS_DIR)
  const ids: string[] = []
  for (const name of entries) {
    if (name.endsWith('.json')) {
      ids.push(name.slice(0, -'.json'.length))
    }
  }
  return ids
}
