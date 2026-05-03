import type { ComponentType } from 'react'
import type { Exercise, ExerciseFormat } from '@/lib/lessons'
import { MultipleChoicePanel } from './MultipleChoicePanel'
import { FillBlankPanel } from './FillBlankPanel'
import { FillBlankTypedPanel } from './FillBlankTypedPanel'
import { SortBucketsPanel } from './SortBucketsPanel'
import { DragReorderPanel } from './DragReorderPanel'

export { MultipleChoicePanel } from './MultipleChoicePanel'
export { FillBlankPanel } from './FillBlankPanel'
export { FillBlankTypedPanel } from './FillBlankTypedPanel'
export { SortBucketsPanel } from './SortBucketsPanel'
export { DragReorderPanel } from './DragReorderPanel'

export type PanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
}

export function getPanelFormat(exercise: Exercise): ExerciseFormat {
  return exercise.format ?? 'code-editor'
}

export const panelRegistry: Partial<
  Record<ExerciseFormat, ComponentType<PanelProps>>
> = {
  'multiple-choice': MultipleChoicePanel,
  'fill-blank': FillBlankPanel,
  'fill-blank-typed': FillBlankTypedPanel,
  'sort-buckets': SortBucketsPanel,
  'drag-reorder': DragReorderPanel,
}
