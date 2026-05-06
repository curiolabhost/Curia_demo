import type { Lesson } from '@/lib/lessons'
import { RightPanel } from './RightPanel'

type LessonWorkspaceProps = {
  lesson: Lesson
  allLessons: Lesson[]
  prevLessonId?: string
  nextLessonId?: string
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
  homeExpanded: boolean
  setHomeExpanded: (v: boolean) => void
  initialExerciseIndex?: number
  onExerciseIndexChange?: (index: number) => void
  onActiveBankIndexChange?: (index: number) => void
}

export function LessonWorkspace({
  lesson,
  allLessons,
  prevLessonId,
  nextLessonId,
  pageIndex,
  setPageIndex,
  totalPages,
  homeExpanded,
  setHomeExpanded,
  initialExerciseIndex,
  onExerciseIndexChange,
  onActiveBankIndexChange,
}: LessonWorkspaceProps) {
  return (
    <RightPanel
      lesson={lesson}
      allLessons={allLessons}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
      pageIndex={pageIndex}
      setPageIndex={setPageIndex}
      totalPages={totalPages}
      homeExpanded={homeExpanded}
      setHomeExpanded={setHomeExpanded}
      initialExerciseIndex={initialExerciseIndex}
      onExerciseIndexChange={onExerciseIndexChange}
      onActiveBankIndexChange={onActiveBankIndexChange}
    />
  )
}
