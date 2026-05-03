import type { Exercise, ExerciseFormat } from '@/lib/lessons'

export { MultipleChoicePanel } from './MultipleChoicePanel'
export { FillBlankPanel } from './FillBlankPanel'

export function getPanelFormat(exercise: Exercise): ExerciseFormat {
  return exercise.format ?? 'code-editor'
}
