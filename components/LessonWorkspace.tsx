import type { Lesson } from '@/lib/lessons'
import { RightPanel } from './RightPanel'

type LessonWorkspaceProps = {
  lesson: Lesson
  prevLessonId?: string
  nextLessonId?: string
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
}

export function LessonWorkspace({
  lesson,
  prevLessonId,
  nextLessonId,
  pageIndex,
  setPageIndex,
  totalPages,
}: LessonWorkspaceProps) {
  return (
    <RightPanel
      lesson={lesson}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
      pageIndex={pageIndex}
      setPageIndex={setPageIndex}
      totalPages={totalPages}
    />
  )
}
