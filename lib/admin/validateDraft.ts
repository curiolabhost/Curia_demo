import { extractBlankIds } from './blankMarkers'

export type ValidationResult = { ok: true } | { ok: false; errors: string[] }

type LooseExercise = {
  format?: unknown
  lines?: unknown
  blanks?: unknown
}

type LooseLine = { id?: unknown; text?: unknown }
type LooseBlank = { id?: unknown }

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function validateDraft(lesson: unknown): ValidationResult {
  const errors: string[] = []

  if (!isObject(lesson)) {
    return { ok: false, errors: ['lesson must be an object'] }
  }
  if (typeof lesson.id !== 'string') errors.push('lesson.id must be a string')
  if (typeof lesson.title !== 'string') errors.push('lesson.title must be a string')
  if (!Array.isArray(lesson.exercises)) {
    errors.push('lesson.exercises must be an array')
    return { ok: false, errors }
  }

  const exercises = lesson.exercises as unknown[]
  exercises.forEach((rawEx, i) => {
    if (!isObject(rawEx)) {
      errors.push(`exercises[${i}] must be an object`)
      return
    }
    const ex = rawEx as LooseExercise
    if (ex.format !== 'final-project') return

    const linesOk = Array.isArray(ex.lines)
    const blanksOk = Array.isArray(ex.blanks)
    if (!linesOk) errors.push(`exercises[${i}].lines must be an array`)
    if (!blanksOk) errors.push(`exercises[${i}].blanks must be an array`)
    if (!linesOk || !blanksOk) return

    const lines = ex.lines as unknown[]
    const blanks = ex.blanks as unknown[]

    const lineIds = new Set<string>()
    const blankIds = new Set<string>()

    lines.forEach((rawLine, li) => {
      if (!isObject(rawLine)) {
        errors.push(`exercises[${i}].lines[${li}] must be an object`)
        return
      }
      const line = rawLine as LooseLine
      if (typeof line.id !== 'string') {
        errors.push(`exercises[${i}].lines[${li}].id must be a string`)
      } else {
        if (lineIds.has(line.id)) {
          errors.push(
            `exercises[${i}].lines[${li}].id duplicate: '${line.id}'`,
          )
        }
        lineIds.add(line.id)
      }
      if (typeof line.text !== 'string') {
        errors.push(`exercises[${i}].lines[${li}].text must be a string`)
      }
    })

    blanks.forEach((rawBlank, bi) => {
      if (!isObject(rawBlank)) {
        errors.push(`exercises[${i}].blanks[${bi}] must be an object`)
        return
      }
      const blank = rawBlank as LooseBlank
      if (typeof blank.id !== 'string') {
        errors.push(`exercises[${i}].blanks[${bi}].id must be a string`)
      } else {
        if (blankIds.has(blank.id)) {
          errors.push(
            `exercises[${i}].blanks[${bi}].id duplicate: '${blank.id}'`,
          )
        }
        blankIds.add(blank.id)
      }
    })

    const referenceCounts = new Map<string, number>()
    lines.forEach((rawLine, li) => {
      const line = rawLine as LooseLine
      if (typeof line.text !== 'string') return
      const found = extractBlankIds(line.text)
      for (const id of found) {
        referenceCounts.set(id, (referenceCounts.get(id) ?? 0) + 1)
        if (!blankIds.has(id)) {
          errors.push(
            `exercises[${i}].lines[${li}] references unknown blank '${id}'`,
          )
        }
      }
    })

    blankIds.forEach((id) => {
      const count = referenceCounts.get(id) ?? 0
      if (count === 0) {
        errors.push(
          `exercises[${i}].blanks contains '${id}' but no line references it`,
        )
      } else if (count > 1) {
        errors.push(
          `exercises[${i}].blanks '${id}' is referenced by ${count} lines (must be exactly 1)`,
        )
      }
    })
  })

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true }
}
