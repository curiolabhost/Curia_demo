import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { Lesson } from '@/lib/lessons'
import type { LayoutMode } from '@/lib/useLayoutMode'
import type { LiveState } from '@/lib/useLiveSession'
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
  answerKeyMode?: boolean
  classroomId?: string | null
  role?: string
  live?: LiveState | null
  liveRespond?: (exerciseIndex: number, isCorrect: boolean, answer?: unknown) => void
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
  isReadOnly = false,
  answerKeyMode = false,
  classroomId = null,
  role = undefined,
  live = null,
  liveRespond,
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
      isReadOnly={isReadOnly}
      answerKeyMode={answerKeyMode}
      classroomId={classroomId}
      role={role}
      live={live}
      liveRespond={liveRespond}
    />
  )
}
