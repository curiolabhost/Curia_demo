import type { Lesson } from './lessons'

export type ItemStatus =
  | 'done'
  | 'active'
  | 'retry'
  | 'locked'

export type LessonProgress = {
  lessonId: string
  exerciseStatuses: ItemStatus[]
  challengeStatuses: ItemStatus[]
  lessonStatus: 'done' | 'active' | 'locked'
}

// TODO: replace with real persistence when tracking is built
export function getProgress(lessons: Lesson[]): LessonProgress[] {
  return lessons.map((lesson) => {
    const exerciseCount = lesson.exercises.length
    const challengeCount = lesson.challenges?.length ?? 0
    const sessionId = lesson.id.split('-')[0]

    if (sessionId !== 's2') {
      return {
        lessonId: lesson.id,
        exerciseStatuses: Array<ItemStatus>(exerciseCount).fill('locked'),
        challengeStatuses: Array<ItemStatus>(challengeCount).fill('locked'),
        lessonStatus: 'locked',
      }
    }

    if (lesson.id === 's2-l0' || lesson.id === 's2-l1') {
      return {
        lessonId: lesson.id,
        exerciseStatuses: Array<ItemStatus>(exerciseCount).fill('done'),
        challengeStatuses: Array<ItemStatus>(challengeCount).fill('done'),
        lessonStatus: 'done',
      }
    }

    if (lesson.id === 's2-l2') {
      const exerciseStatuses: ItemStatus[] = []
      for (let i = 0; i < exerciseCount; i++) {
        if (i < 3) exerciseStatuses.push('done')
        else if (i === 3) exerciseStatuses.push('active')
        else exerciseStatuses.push('locked')
      }
      return {
        lessonId: lesson.id,
        exerciseStatuses,
        challengeStatuses: Array<ItemStatus>(challengeCount).fill('locked'),
        lessonStatus: 'active',
      }
    }

    return {
      lessonId: lesson.id,
      exerciseStatuses: Array<ItemStatus>(exerciseCount).fill('locked'),
      challengeStatuses: Array<ItemStatus>(challengeCount).fill('locked'),
      lessonStatus: 'locked',
    }
  })
}
