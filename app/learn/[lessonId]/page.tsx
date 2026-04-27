import { LessonWorkspace } from '@/components/LessonWorkspace'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { getAllLessons, getLessonById } from '@/lib/lessons'

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const allLessons = getAllLessons()
  const activeLesson = getLessonById(params.lessonId)

  if (!activeLesson) {
    return (
      <div className="app-shell">
        <TopBar session="" completedCount={0} totalCount={allLessons.length} />
        <div className="app-main">
          <Sidebar
            lessons={allLessons}
            activeLessonId={params.lessonId}
            completedIds={[]}
          />
          <div className="right-panel">
            <div style={{ padding: 24, color: 'var(--text2)' }}>Lesson not found.</div>
          </div>
        </div>
      </div>
    )
  }

  const activeIdx = allLessons.findIndex((l) => l.id === activeLesson.id)
  const prevLessonId = activeIdx > 0 ? allLessons[activeIdx - 1].id : undefined
  const nextLessonId =
    activeIdx >= 0 && activeIdx < allLessons.length - 1
      ? allLessons[activeIdx + 1].id
      : undefined

  return (
    <div className="app-shell">
      <TopBar
        session={activeLesson.session}
        completedCount={0}
        totalCount={allLessons.length}
      />
      <div className="app-main">
        <Sidebar
          lessons={allLessons}
          activeLessonId={activeLesson.id}
          completedIds={[]}
        />
        <LessonWorkspace
          lesson={activeLesson}
          prevLessonId={prevLessonId}
          nextLessonId={nextLessonId}
        />
      </div>
    </div>
  )
}
