import type { Lesson } from '@/lib/lessons'

// FIXME(map-migration): s2 has 11 lessons but the only island template currently
// available is medium-1 (5 slots). Until an x-large island template is built in
// Tiled and added to sessionConfig, restrict s2 to its first two lessons so the
// migration is visually verifiable on the existing template. Remove this filter
// once s2 → xlarge-1 is wired up.
const SESSION_LESSON_FILTER: Record<string, ReadonlySet<string>> = {
  s2: new Set(['s2-l1', 's2-l2']),
}

export function applySessionLessonFilter(
  sessionId: string,
  lessons: Lesson[],
): Lesson[] {
  const allow = SESSION_LESSON_FILTER[sessionId]
  if (!allow) return lessons
  return lessons.filter((l) => allow.has(l.id))
}
