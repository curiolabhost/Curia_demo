import { postExerciseProgress, postAdminExerciseProgress } from './progressClient'

type RecordArgs = {
  classroomId: string | null
  lessonId: string
  exerciseIndex: number
  format: string
  role?: string
}

/**
 * Persist that a student (or admin) answered an exercise correctly. Shared by
 * the split-view RightPanel and the interactive slideshow so the two can't drift.
 */
export function recordExerciseCorrect({
  classroomId,
  lessonId,
  exerciseIndex,
  format,
  role,
}: RecordArgs): void {
  if (!classroomId) return
  const postEx = role === 'ADMIN' ? postAdminExerciseProgress : postExerciseProgress
  postEx(classroomId, lessonId, exerciseIndex, {
    format,
    answerState: {},
    completed: true,
    completedAt: new Date().toISOString(),
  }).catch(() => {})
}
