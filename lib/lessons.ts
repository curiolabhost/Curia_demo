import s2l0 from '@/content/lessons/s2-l0.json'
import s2l1 from '@/content/lessons/s2-l1.json'
import s2l2 from '@/content/lessons/s2-l2.json'
import s2l3 from '@/content/lessons/s2-l3.json'
import s2l4 from '@/content/lessons/s2-l4.json'
import s2l5 from '@/content/lessons/s2-l5.json'
import s2l6 from '@/content/lessons/s2-l6.json'
import s2l7 from '@/content/lessons/s2-l7.json'
import s2l8 from '@/content/lessons/s2-l8.json'

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
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | { kind: 'video'; src: string; caption?: string }
  | { kind: 'diagram'; variant: string }

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
  carryFrom?: number
  checks?: Check[]
}

export type Challenge = {
  id: string
  level: number
  difficulty: 'easy' | 'medium' | 'tricky'
  title: string
  description: string
  buggyCode: string
  starterCode: string
  hint?: string
  checks?: Check[]
  explanation: string
}

export type ContentPage = {
  heading?: string
  blocks: ContentBlock[]
}

export type Lesson = {
  id: string
  session: string
  title: string
  content: ContentPage[]
  exercises: Exercise[]
  challenges?: Challenge[]
  customize?: string[]
}

const lessons: Lesson[] = [
  s2l0, s2l1, s2l2, s2l3, s2l4, s2l5, s2l6, s2l7, s2l8,
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
