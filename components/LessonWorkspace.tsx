import type { Lesson } from '@/lib/lessons'
import { RightPanel } from './RightPanel'

type LessonWorkspaceProps = {
  lesson: Lesson
  prevLessonId?: string
  nextLessonId?: string
}

export function LessonWorkspace({
  lesson,
  prevLessonId,
  nextLessonId,
}: LessonWorkspaceProps) {
  return (
    <RightPanel
      lesson={lesson}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
    />
  )
}
