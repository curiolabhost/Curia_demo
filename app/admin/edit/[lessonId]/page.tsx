import { notFound } from 'next/navigation'
import { assertEditAllowed } from '@/lib/admin/gate'
import { loadLessonFromDisk } from '@/lib/admin/loadLessonFromDisk'
import { AdminEditClient } from './AdminEditClient'

export const dynamic = 'force-dynamic'

export default async function AdminEditPage({
  params,
}: {
  params: { lessonId: string }
}) {
  const gate = assertEditAllowed()
  if (!gate.ok) {
    notFound()
  }
  const lesson = await loadLessonFromDisk(params.lessonId)
  if (!lesson) {
    notFound()
  }
  return <AdminEditClient lessonId={params.lessonId} initialLesson={lesson} />
}
