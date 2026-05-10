'use client'

import { useMemo } from 'react'
import { LearnPageClient } from '@/components/LearnPageClient'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import {
  draftToLesson,
  useLessonDraft,
} from '@/lib/admin/useLessonDraft'
import { getAllLessons, type Lesson } from '@/lib/lessons'

type AdminEditClientProps = {
  lessonId: string
  initialLesson: Lesson
}

export function AdminEditClient({
  lessonId,
  initialLesson,
}: AdminEditClientProps) {
  const { draft, dirty, saveState, saveError, actions, save } =
    useLessonDraft(initialLesson)

  const lesson = useMemo(() => draftToLesson(draft), [draft])

  const allLessons = useMemo(() => {
    const list = getAllLessons()
    return list.map((l) => (l.id === lessonId ? lesson : l))
  }, [lesson, lessonId])

  return (
    <>
      <AdminTopBar
        lessonId={lessonId}
        dirty={dirty}
        saveState={saveState}
        saveError={saveError}
        onSave={() => save(lessonId)}
      />
      <div className="admin-shell">
        <LearnPageClient
          lessons={allLessons}
          activeLesson={lesson}
          activeLessonId={lessonId}
          session={lesson.session}
          editMode
          editActions={actions}
        />
      </div>
    </>
  )
}
