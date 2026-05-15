const keyFor = (lessonId: string, exerciseIndex: number) =>
  `codelab__${lessonId}__ex${exerciseIndex}`

export function saveCode(
  lessonId: string,
  exerciseIndex: number,
  code: string,
): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(keyFor(lessonId, exerciseIndex), code)
}

export function loadCode(
  lessonId: string,
  exerciseIndex: number,
  fallback: string,
): string {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(keyFor(lessonId, exerciseIndex))
  return value ?? fallback
}

