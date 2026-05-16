type LessonProgress = {
  lastExerciseIndex: number
  lastChallengeIndex: number
  lastMode: string
  completedAt: string | null
}

type ExerciseProgress = {
  format: string
  answerState: unknown
  completed: boolean
  completedAt: string | null
}

type CodeProgress = {
  code: string
  completed: boolean
  completedAt: string | null
}

type FinalProjectBlock = {
  drops: Record<string, string>
  typed: Record<string, string>
  completedAt: string | null
}

type FinalProjectProgress = {
  activeBlockIndex: number
  blocks: Record<string, FinalProjectBlock>
  editedHtml: string | null
  editedCss: string | null
  completedAt: string | null
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function getLessonProgress(
  classroomId: string,
  lessonId: string
): Promise<{ ok: boolean; progress: LessonProgress | null }> {
  const url = `/api/progress/${classroomId}/lesson/${lessonId}`
  const data = await getJson<{ ok?: boolean; progress?: LessonProgress | null }>(url)
  if (!data || data.ok === false) return { ok: false, progress: null }
  return { ok: true, progress: data.progress ?? null }
}

export async function postLessonProgress(
  classroomId: string,
  lessonId: string,
  data: {
    lastExerciseIndex?: number
    lastChallengeIndex?: number
    lastMode?: string
    completedAt?: string | null
  }
): Promise<{ ok: boolean }> {
  const url = `/api/progress/${classroomId}/lesson/${lessonId}`
  const ok = await postJson(url, data)
  return { ok }
}

export async function getExerciseProgress(
  classroomId: string,
  lessonId: string,
  exerciseIndex: number
): Promise<{ ok: boolean; progress: ExerciseProgress | null }> {
  const url = `/api/progress/${classroomId}/exercise/${lessonId}/${exerciseIndex}`
  const data = await getJson<{ ok?: boolean; progress?: ExerciseProgress | null }>(url)
  if (!data || data.ok === false) return { ok: false, progress: null }
  return { ok: true, progress: data.progress ?? null }
}

export async function postExerciseProgress(
  classroomId: string,
  lessonId: string,
  exerciseIndex: number,
  data: {
    format: string
    answerState: unknown
    completed: boolean
    completedAt?: string | null
  }
): Promise<{ ok: boolean }> {
  const url = `/api/progress/${classroomId}/exercise/${lessonId}/${exerciseIndex}`
  const ok = await postJson(url, data)
  return { ok }
}

export async function getCodeProgress(
  classroomId: string,
  lessonId: string,
  exerciseIndex: number
): Promise<{ ok: boolean; progress: CodeProgress | null }> {
  const url = `/api/progress/${classroomId}/code/${lessonId}/${exerciseIndex}`
  const data = await getJson<{ ok?: boolean; progress?: CodeProgress | null }>(url)
  if (!data || data.ok === false) return { ok: false, progress: null }
  return { ok: true, progress: data.progress ?? null }
}

export async function postCodeProgress(
  classroomId: string,
  lessonId: string,
  exerciseIndex: number,
  data: {
    code: string
    completed: boolean
    completedAt?: string | null
  }
): Promise<{ ok: boolean }> {
  const url = `/api/progress/${classroomId}/code/${lessonId}/${exerciseIndex}`
  const ok = await postJson(url, data)
  return { ok }
}

export async function getFinalProjectProgress(
  classroomId: string,
  lessonId: string
): Promise<{ ok: boolean; progress: FinalProjectProgress | null }> {
  const url = `/api/progress/${classroomId}/final-project/${lessonId}`
  const data = await getJson<{ ok?: boolean; progress?: FinalProjectProgress | null }>(url)
  if (!data || data.ok === false) return { ok: false, progress: null }
  return { ok: true, progress: data.progress ?? null }
}

export async function postFinalProjectProgress(
  classroomId: string,
  lessonId: string,
  data: {
    activeBlockIndex: number
    blocks: Record<string, FinalProjectBlock>
    editedHtml?: string | null
    editedCss?: string | null
    completedAt?: string | null
  }
): Promise<{ ok: boolean }> {
  const url = `/api/progress/${classroomId}/final-project/${lessonId}`
  const ok = await postJson(url, data)
  return { ok }
}

export type LessonProgressRow = {
  lessonId: string
  lastExerciseIndex: number
  lastChallengeIndex: number
  lastMode: string
  completedAt: string | null
  updatedAt: string
}

export async function getClassroomLessonsProgress(classroomId: string): Promise<{
  ok: boolean
  lessons: LessonProgressRow[]
}> {
  try {
    const res = await fetch(`/api/progress/${classroomId}/lessons`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return { ok: false, lessons: [] }
    const data = await res.json()
    return { ok: true, lessons: data.lessons ?? [] }
  } catch {
    return { ok: false, lessons: [] }
  }
}
