import type { Lesson } from '@/lib/lessons'
import type { Slot } from './types'

export function pickSlots(allSlots: Slot[], lessonCount: number): Slot[] {
  if (lessonCount === 0) return []
  const sorted = [...allSlots].sort((a, b) => a.slotIndex - b.slotIndex)
  if (lessonCount >= sorted.length) return sorted
  if (lessonCount === 1) return [sorted[0]]

  const result = [sorted[0], sorted[sorted.length - 1]]
  const middleSlots = sorted.slice(1, -1)
  const middleCount = lessonCount - 2

  if (middleCount > 0) {
    const step = (middleSlots.length - 1) / Math.max(middleCount - 1, 1)
    for (let i = 0; i < middleCount; i++) {
      result.splice(-1, 0, middleSlots[Math.round(i * step)])
    }
  }
  return result
}

function parseLessonOrdinal(id: string): number {
  const m = id.match(/-l(\d+)$/)
  if (!m) {
    throw new Error(
      `Lesson id "${id}" does not match expected pattern s{n}-l{m}`,
    )
  }
  return Number(m[1])
}

export function assertLessonsOrdered(lessons: Lesson[]): void {
  for (let i = 1; i < lessons.length; i++) {
    const prev = parseLessonOrdinal(lessons[i - 1].id)
    const curr = parseLessonOrdinal(lessons[i].id)
    if (curr <= prev) {
      throw new Error(
        `Lessons must be in natural id order before slot distribution. ` +
          `Got "${lessons[i - 1].id}" (l${prev}) followed by "${lessons[i].id}" (l${curr}).`,
      )
    }
  }
}
