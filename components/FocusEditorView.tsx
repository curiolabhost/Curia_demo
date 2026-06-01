'use client'

import type { Lesson } from '@/lib/lessons'
import type { LiveState } from '@/lib/useLiveSession'
import { RightPanel } from './RightPanel'

type FocusEditorViewProps = {
  lesson: Lesson
  allLessons: Lesson[]
  exerciseIndex: number
  classroomId?: string | null
  role?: string
  isReadOnly?: boolean
  live?: LiveState | null
  liveRespond?: (exerciseIndex: number, isCorrect: boolean, answer?: unknown) => void
  onExit: () => void
}

// Full-screen, single-exercise editor — the real split-view runtime (RightPanel),
// locked to one exercise with the split hidden. Launched from a code slide.
export function FocusEditorView({
  lesson,
  allLessons,
  exerciseIndex,
  classroomId = null,
  role,
  isReadOnly = false,
  live = null,
  liveRespond,
  onExit,
}: FocusEditorViewProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <RightPanel
        lesson={lesson}
        allLessons={allLessons}
        pageIndex={0}
        setPageIndex={() => {}}
        totalPages={lesson.content.length}
        layoutMode="expanded-right"
        onResetLayout={() => {}}
        onToggleRight={() => {}}
        initialExerciseIndex={exerciseIndex}
        initialMode="exercises"
        classroomId={classroomId}
        role={role}
        isReadOnly={isReadOnly}
        live={live}
        liveRespond={liveRespond}
        focusMode
        onExitFocus={onExit}
      />
    </div>
  )
}
