import type { Lesson } from '@/lib/lessons'
import type { LessonProgressRow } from '@/lib/progressClient'

export type ItemStatus = 'done' | 'active' | 'retry' | 'locked'

export type LessonProgress = {
  lessonId: string
  exerciseStatuses: ItemStatus[]
  challengeStatuses: ItemStatus[]
  lessonStatus: 'done' | 'active' | 'locked'
}

export function deriveProgress(
  lessons: Lesson[],
  progressRows: LessonProgressRow[]
): LessonProgress[] {
  const rowMap = new Map<string, LessonProgressRow>()
  for (const row of progressRows) {
    rowMap.set(row.lessonId, row)
  }

  return lessons.map((lesson) => {
    const row = rowMap.get(lesson.id)
    const exerciseCount = lesson.exercises?.length ?? 0
    const challengeCount = lesson.challenges?.length ?? 0

    if (!row) {
      return {
        lessonId: lesson.id,
        lessonStatus: 'active',
        exerciseStatuses: Array<ItemStatus>(exerciseCount).fill('active'),
        challengeStatuses: Array<ItemStatus>(challengeCount).fill('active'),
      }
    }

    const lessonStatus: 'done' | 'active' = row.completedAt ? 'done' : 'active'

    const exerciseStatuses: ItemStatus[] = Array.from(
      { length: exerciseCount },
      (_, i) => {
        if (row.completedAt) return 'done'
        if (i < row.lastExerciseIndex) return 'done'
        return 'active'
      },
    )

    const challengeStatuses: ItemStatus[] = Array<ItemStatus>(challengeCount).fill('active')

    return {
      lessonId: lesson.id,
      lessonStatus,
      exerciseStatuses,
      challengeStatuses,
    }
  })
}
