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
  onToggleRight: () => void
  initialExerciseIndex?: number
  initialMode?: 'exercises' | 'challenges'
  onExerciseIndexChange?: (index: number) => void
  onActiveBankIndexChange?: (index: number) => void
  onLineSelect?: (
    lineIndex: number | null,
    blankIndex: number | null,
  ) => void
  editMode?: boolean
  editActions?: EditActions
  isReadOnly?: boolean
  classroomId?: string | null
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
  onToggleRight,
  initialExerciseIndex,
  initialMode,
  onExerciseIndexChange,
  onActiveBankIndexChange,
  onLineSelect,
  editMode = false,
  editActions,
  classroomId = null,
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
      onToggleRight={onToggleRight}
      initialExerciseIndex={initialExerciseIndex}
      initialMode={initialMode}
      onExerciseIndexChange={onExerciseIndexChange}
      onActiveBankIndexChange={onActiveBankIndexChange}
      onLineSelect={onLineSelect}
      editMode={editMode}
      editActions={editActions}
      classroomId={classroomId}
    />
  )
}
