import { LearnPageClient } from '@/components/LearnPageClient'
import { getAllLessons, getLessonById } from '@/lib/lessons'

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const allLessons = getAllLessons()
  const activeLesson = getLessonById(params.lessonId)

  const activeIdx = activeLesson
    ? allLessons.findIndex((l) => l.id === activeLesson.id)
    : -1
  const prevLessonId = activeIdx > 0 ? allLessons[activeIdx - 1].id : undefined
  const nextLessonId =
    activeIdx >= 0 && activeIdx < allLessons.length - 1
      ? allLessons[activeIdx + 1].id
      : undefined

  return (
    <LearnPageClient
      lessons={allLessons}
      activeLesson={activeLesson}
      activeLessonId={params.lessonId}
      prevLessonId={prevLessonId}
      nextLessonId={nextLessonId}
      session={activeLesson?.session ?? ''}
    />
  )
}
