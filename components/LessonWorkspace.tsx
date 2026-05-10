import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { Lesson } from '@/lib/lessons'
import type { LayoutMode } from '@/lib/useLayoutMode'
import { RightPanel } from './RightPanel'

type LessonWorkspaceProps = {
  lesson: Lesson
  allLessons: Lesson[]
  prevLessonId?: string
  nextLessonId?: string
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
  layoutMode: LayoutMode
  onResetLayout: () => void
  onExpandRight: () => void
  onToggleRight: () => void
  initialExerciseIndex?: number
  onExerciseIndexChange?: (index: number) => void
  onActiveBankIndexChange?: (index: number) => void
  onLineSelect?: (
    lineIndex: number | null,
    blankIndex: number | null,
  ) => void
  editMode?: boolean
  editActions?: EditActions
}

export function LessonWorkspace({
  lesson,
  allLessons,
  prevLessonId,
  nextLessonId,
  pageIndex,
  setPageIndex,
  totalPages,
  layoutMode,
  onResetLayout,
  onExpandRight,
  onToggleRight,
  initialExerciseIndex,
  onExerciseIndexChange,
  onActiveBankIndexChange,
  onLineSelect,
  editMode = false,
  editActions,
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
      layoutMode={layoutMode}
      onResetLayout={onResetLayout}
      onExpandRight={onExpandRight}
      onToggleRight={onToggleRight}
      initialExerciseIndex={initialExerciseIndex}
      onExerciseIndexChange={onExerciseIndexChange}
      onActiveBankIndexChange={onActiveBankIndexChange}
      onLineSelect={onLineSelect}
      editMode={editMode}
      editActions={editActions}
    />
  )
}
