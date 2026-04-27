import s2l1 from '@/content/lessons/s2-l1.json'
import s2l2 from '@/content/lessons/s2-l2.json'
import s2l3 from '@/content/lessons/s2-l3.json'
import s3l1 from '@/content/lessons/s3-l1.json'
import s3l2 from '@/content/lessons/s3-l2.json'
import s3l3 from '@/content/lessons/s3-l3.json'
import s4l1 from '@/content/lessons/s4-l1.json'
import s4l2 from '@/content/lessons/s4-l2.json'
import s4l3 from '@/content/lessons/s4-l3.json'
import s5l1 from '@/content/lessons/s5-l1.json'
import s5l2 from '@/content/lessons/s5-l2.json'
import s5l3 from '@/content/lessons/s5-l3.json'

export type ContentBlock =
  | { kind: 'p'; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'concept'; code: string; desc: string }
  | { kind: 'callout'; variant: 'info' | 'warn' | 'danger'; label: string; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }

export type Check =
  | { type: 'variable'; name: string; expected: unknown; label?: string }
  | { type: 'call'; fn: string; args: unknown[]; assert: string; label?: string }
  | { type: 'console'; includes: string; label?: string }

export type Exercise = {
  title: string
  type: 'practice' | 'predict' | 'debug' | 'apply' | 'independent' | 'challenge'
  duration: string
  tasks: string[]
  hint?: string
  starterCode: string
  checks?: Check[]
}

export type Lesson = {
  id: string
  session: string
  title: string
  content: {
    heading: string
    body: ContentBlock[]
  }
  exercises: Exercise[]
  customize?: string[]
}

const lessons: Lesson[] = [
  s2l1, s2l2, s2l3,
  s3l1, s3l2, s3l3,
  s4l1, s4l2, s4l3,
  s5l1, s5l2, s5l3,
] as Lesson[]

export function getAllLessons(): Lesson[] {
  return lessons
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}
