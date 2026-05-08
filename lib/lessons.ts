import s1l1 from '@/content/lessons/s1-l1.json'
import s1l2 from '@/content/lessons/s1-l2.json'

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

import s6l1 from '@/content/lessons/s6-l1.json'

export type ExpectedEffect =
  | { type: 'declaration'; valueType?: string; value?: unknown }
  | { type: 'assignment'; valueType?: string; value?: unknown }
  | { type: 'noError' }
  | { type: 'domAssignment'; elementId: string; property: string; valueType?: string }
  | { type: 'variableValue'; name: string; expected: unknown }

export type BlankInputMode = 'wordbank' | 'type' | 'freeline'

export type ContentBlock =
  | { kind: 'p'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'code'; lines: string[] }
  | { kind: 'concept'; code: string; desc: string }
  | { kind: 'callout'; variant: 'info' | 'warn' | 'danger'; label: string; text: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'image'; src: string; alt: string; caption?: string }
  | { kind: 'video'; src: string; caption?: string }
  | { kind: 'diagram'; variant: string }
  | { kind: 'embed'; src: string; height?: number; caption?: string }

export type Check =
  | { type: 'variable'; name: string; expected: unknown; label?: string }
  | { type: 'call'; fn: string; args: unknown[]; assert: string; label?: string }
  | { type: 'console'; includes: string; label?: string }

export type ExerciseFormat =
  | 'code-editor'
  | 'multiple-choice'
  | 'fill-blank'
  | 'fill-blank-typed'
  | 'drag-reorder'
  | 'sort-buckets'
  | 'final-project'
  | 'code-viewer'

export type CodeViewerFile = {
  filename: string
  src: string
}

export type FinalProjectFile = 'script' | 'html' | 'css'

export type MultipleChoiceOption = {
  id: string
  label: string
  code?: string
}

export type FillBlankToken = {
  id: string
  label: string
}

export type SortBucket = {
  id: string
  label: string
}

export type SortItem = {
  id: string
  label: string
  code?: string
  correctBucketId: string
}

export type LineExplanation = {
  lineIndex: number
  blankIndex: number | null
  instruction?: string
  explanation: string
  lessonRefs?: string[]
}

export type Exercise = {
  title: string
  type: 'practice' | 'predict' | 'debug' | 'apply' | 'independent' | 'challenge'
  duration: string
  tasks: string[]
  hint?: string
  starterCode?: string
  carryFrom?: number
  checks?: Check[]
  format?: ExerciseFormat
  options?: MultipleChoiceOption[]
  correctOptionId?: string
  codeWithBlanks?: string[]
  tokenBank?: FillBlankToken[]
  correctOrder?: string[]
  blankPlaceholders?: string[]
  blankWidths?: number[]
  blankInstructions?: string[]
  blankExplanations?: string[]
  codeLines?: string[]
  buckets?: SortBucket[]
  bucketItems?: SortItem[]
  explanation?: string
  lessonRefs?: string[]
  codePrefix?: string
  codeSuffix?: string
  blankInputMode?: BlankInputMode[]
  expectedEffects?: ExpectedEffect[]
  codeFiles?: CodeViewerFile[]
  lineExplanations?: LineExplanation[]
  editableFiles?: string[]
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
  finalProject?: {
    htmlTemplate: string
    cssTemplate: string
  }
}

const lessons: Lesson[] = [
  s1l1, s1l2,
  s2l0, s2l1, s2l2, s2l3, s2l4, s2l5, s2l6, s2l7, s2l8,
  s3l1, s3l2, s3l3,
  s4l1, s4l2, s4l3,
  s5l1, s5l2, s5l3,
  s6l1,
] as Lesson[]

export function getAllLessons(): Lesson[] {
  return lessons
}

export type SessionGroup = {
  sessionId: string
  sessionLabel: string
  lessons: Lesson[]
}

export function getLessonsBySession(): SessionGroup[] {
  const order = ['s1', 's2', 's3', 's4', 's5', 's6']
  const map = new Map<string, SessionGroup>()
  for (const lesson of lessons) {
    const sessionId = lesson.id.split('-')[0]
    let group = map.get(sessionId)
    if (!group) {
      group = { sessionId, sessionLabel: lesson.session, lessons: [] }
      map.set(sessionId, group)
    }
    group.lessons.push(lesson)
  }
  const result: SessionGroup[] = []
  for (const id of order) {
    const group = map.get(id)
    if (group) result.push(group)
  }
  return result
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id)
}
