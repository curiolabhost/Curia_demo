'use client'

import { useCallback, useMemo, useReducer } from 'react'
import type {
  BlankInputMode,
  Exercise,
  FinalProjectBlank,
  FinalProjectLine,
  FillBlankToken,
  Lesson,
} from '@/lib/lessons'
import { mintBlankId, mintLineId, mintTokenId } from './id'
import {
  normalizeSegments,
  parseSegments,
  serializeSegments,
  type LineSegment,
} from './blankMarkers'

export type DraftLine = Omit<FinalProjectLine, 'text'> & {
  segments: LineSegment[]
}

export type DraftExercise = Omit<Exercise, 'lines'> & {
  lines: DraftLine[]
}

export type DraftLesson = Omit<Lesson, 'exercises'> & {
  exercises: DraftExercise[]
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type State = {
  draft: DraftLesson
  dirty: boolean
  saveState: SaveState
  saveError: string | null
}

type BlockMetaPartial = Partial<
  Pick<Exercise, 'title' | 'hint' | 'codePrefix' | 'codeSuffix'>
>

type Action =
  | { type: 'blocks.add'; atIndex: number }
  | { type: 'blocks.delete'; blockIdx: number }
  | { type: 'blocks.move'; from: number; to: number }
  | { type: 'blocks.updateMeta'; blockIdx: number; partial: BlockMetaPartial }
  | { type: 'lines.add'; blockIdx: number; atIndex: number }
  | { type: 'lines.delete'; blockIdx: number; lineIdx: number }
  | { type: 'lines.move'; blockIdx: number; from: number; to: number }
  | {
      type: 'lines.editSegments'
      blockIdx: number
      lineIdx: number
      segments: LineSegment[]
    }
  | {
      type: 'lines.editExplanation'
      blockIdx: number
      lineIdx: number
      explanation: string
    }
  | {
      type: 'lines.editLessonRefs'
      blockIdx: number
      lineIdx: number
      refs: string[]
    }
  | {
      type: 'blanks.insert'
      blockIdx: number
      lineIdx: number
      segmentPosition: number
      mode: BlankInputMode
    }
  | { type: 'blanks.add'; blockIdx: number; blank: FinalProjectBlank }
  | { type: 'blanks.remove'; blockIdx: number; blankId: string }
  | {
      type: 'blanks.update'
      blockIdx: number
      blankId: string
      partial: Partial<FinalProjectBlank>
    }
  | { type: 'tasks.add'; blockIdx: number }
  | { type: 'tasks.delete'; blockIdx: number; taskIdx: number }
  | { type: 'tasks.move'; blockIdx: number; from: number; to: number }
  | {
      type: 'tasks.edit'
      blockIdx: number
      taskIdx: number
      text: string
    }
  | { type: 'tokens.add'; blockIdx: number }
  | { type: 'tokens.delete'; blockIdx: number; tokenId: string }
  | { type: 'tokens.move'; blockIdx: number; from: number; to: number }
  | {
      type: 'tokens.edit'
      blockIdx: number
      tokenId: string
      label: string
    }
  | { type: 'save.start' }
  | { type: 'save.success' }
  | { type: 'save.error'; message: string }

export function lessonToDraft(lesson: Lesson): DraftLesson {
  return {
    ...lesson,
    exercises: lesson.exercises.map((ex) => ({
      ...ex,
      lines: (ex.lines ?? []).map((l) => ({
        id: l.id,
        explanation: l.explanation,
        lessonRefs: l.lessonRefs,
        segments: normalizeSegments(parseSegments(l.text ?? '')),
      })),
    })),
  }
}

export function draftToLesson(draft: DraftLesson): Lesson {
  return {
    ...draft,
    exercises: draft.exercises.map((ex) => {
      const next: Exercise = {
        ...ex,
        lines: ex.lines.map((dl) => {
          const out: FinalProjectLine = {
            id: dl.id,
            text: serializeSegments(dl.segments),
          }
          if (dl.explanation !== undefined) out.explanation = dl.explanation
          if (dl.lessonRefs !== undefined) out.lessonRefs = dl.lessonRefs
          return out
        }),
      }
      return next
    }),
  }
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr
  if (from < 0 || from >= arr.length) return arr
  if (to < 0 || to >= arr.length) return arr
  const next = arr.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function collectBlockLineIds(block: DraftExercise): Set<string> {
  const s = new Set<string>()
  for (const l of block.lines) s.add(l.id)
  return s
}

function collectBlockBlankIds(block: DraftExercise): Set<string> {
  const s = new Set<string>()
  for (const b of block.blanks ?? []) s.add(b.id)
  return s
}

function collectBlockTokenIds(block: DraftExercise): Set<string> {
  const s = new Set<string>()
  for (const t of block.tokenBank ?? []) s.add(t.id)
  return s
}

function makePlaceholderBlock(): DraftExercise {
  return {
    title: 'New block',
    type: 'practice',
    duration: '5 min',
    format: 'final-project',
    tasks: [],
    hint: '',
    tokenBank: [],
    checks: [],
    lines: [],
    blanks: [],
  }
}

function updateBlock(
  state: State,
  blockIdx: number,
  fn: (block: DraftExercise) => DraftExercise,
): State {
  const exercises = state.draft.exercises.slice()
  const current = exercises[blockIdx]
  if (!current) return state
  exercises[blockIdx] = fn(current)
  return {
    ...state,
    draft: { ...state.draft, exercises },
    dirty: true,
    saveState: state.saveState === 'saved' ? 'idle' : state.saveState,
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'blocks.add': {
      const exercises = state.draft.exercises.slice()
      const idx = Math.max(0, Math.min(action.atIndex, exercises.length))
      exercises.splice(idx, 0, makePlaceholderBlock())
      return {
        ...state,
        draft: { ...state.draft, exercises },
        dirty: true,
        saveState: state.saveState === 'saved' ? 'idle' : state.saveState,
      }
    }
    case 'blocks.delete': {
      if (action.blockIdx < 0 || action.blockIdx >= state.draft.exercises.length)
        return state
      const exercises = state.draft.exercises.slice()
      exercises.splice(action.blockIdx, 1)
      return {
        ...state,
        draft: { ...state.draft, exercises },
        dirty: true,
        saveState: state.saveState === 'saved' ? 'idle' : state.saveState,
      }
    }
    case 'blocks.move': {
      const exercises = moveItem(state.draft.exercises, action.from, action.to)
      if (exercises === state.draft.exercises) return state
      return {
        ...state,
        draft: { ...state.draft, exercises },
        dirty: true,
        saveState: state.saveState === 'saved' ? 'idle' : state.saveState,
      }
    }
    case 'blocks.updateMeta': {
      return updateBlock(state, action.blockIdx, (block) => ({
        ...block,
        ...action.partial,
      }))
    }
    case 'lines.add': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.slice()
        const idx = Math.max(0, Math.min(action.atIndex, lines.length))
        const id = mintLineId(collectBlockLineIds(block))
        lines.splice(idx, 0, {
          id,
          segments: normalizeSegments([]),
        })
        return { ...block, lines }
      })
    }
    case 'lines.delete': {
      return updateBlock(state, action.blockIdx, (block) => {
        const target = block.lines[action.lineIdx]
        if (!target) return block
        const removedBlankIds = new Set<string>()
        for (const seg of target.segments) {
          if (seg.kind === 'blank') removedBlankIds.add(seg.blankId)
        }
        const lines = block.lines.slice()
        lines.splice(action.lineIdx, 1)
        const blanks = (block.blanks ?? []).filter(
          (b) => !removedBlankIds.has(b.id),
        )
        return { ...block, lines, blanks }
      })
    }
    case 'lines.move': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = moveItem(block.lines, action.from, action.to)
        if (lines === block.lines) return block
        return { ...block, lines }
      })
    }
    case 'lines.editSegments': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.slice()
        const cur = lines[action.lineIdx]
        if (!cur) return block
        lines[action.lineIdx] = {
          ...cur,
          segments: normalizeSegments(action.segments),
        }
        return { ...block, lines }
      })
    }
    case 'lines.editExplanation': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.slice()
        const cur = lines[action.lineIdx]
        if (!cur) return block
        const explanation = action.explanation
        lines[action.lineIdx] = {
          ...cur,
          explanation: explanation.length > 0 ? explanation : undefined,
        }
        return { ...block, lines }
      })
    }
    case 'lines.editLessonRefs': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.slice()
        const cur = lines[action.lineIdx]
        if (!cur) return block
        lines[action.lineIdx] = {
          ...cur,
          lessonRefs: action.refs.length > 0 ? action.refs : undefined,
        }
        return { ...block, lines }
      })
    }
    case 'blanks.insert': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.slice()
        const cur = lines[action.lineIdx]
        if (!cur) return block
        const id = mintBlankId(collectBlockBlankIds(block))
        const segments = cur.segments.slice()
        const pos = Math.max(0, Math.min(action.segmentPosition, segments.length))
        segments.splice(pos, 0, { kind: 'blank', blankId: id })
        lines[action.lineIdx] = {
          ...cur,
          segments: normalizeSegments(segments),
        }
        const newBlank: FinalProjectBlank = {
          id,
          mode: action.mode,
          answer: '',
        }
        const blanks = (block.blanks ?? []).concat(newBlank)
        return { ...block, lines, blanks }
      })
    }
    case 'blanks.add': {
      return updateBlock(state, action.blockIdx, (block) => {
        const blanks = (block.blanks ?? []).concat(action.blank)
        return { ...block, blanks }
      })
    }
    case 'blanks.remove': {
      return updateBlock(state, action.blockIdx, (block) => {
        const lines = block.lines.map((l) => {
          if (!l.segments.some((s) => s.kind === 'blank' && s.blankId === action.blankId)) {
            return l
          }
          return {
            ...l,
            segments: normalizeSegments(
              l.segments.filter(
                (s) => !(s.kind === 'blank' && s.blankId === action.blankId),
              ),
            ),
          }
        })
        const blanks = (block.blanks ?? []).filter(
          (b) => b.id !== action.blankId,
        )
        return { ...block, lines, blanks }
      })
    }
    case 'blanks.update': {
      return updateBlock(state, action.blockIdx, (block) => {
        const blanks = (block.blanks ?? []).map((b) =>
          b.id === action.blankId ? { ...b, ...action.partial } : b,
        )
        return { ...block, blanks }
      })
    }
    case 'tasks.add': {
      return updateBlock(state, action.blockIdx, (block) => ({
        ...block,
        tasks: (block.tasks ?? []).concat(''),
      }))
    }
    case 'tasks.delete': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tasks = (block.tasks ?? []).slice()
        if (action.taskIdx < 0 || action.taskIdx >= tasks.length) return block
        tasks.splice(action.taskIdx, 1)
        return { ...block, tasks }
      })
    }
    case 'tasks.move': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tasks = moveItem(block.tasks ?? [], action.from, action.to)
        if (tasks === block.tasks) return block
        return { ...block, tasks }
      })
    }
    case 'tasks.edit': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tasks = (block.tasks ?? []).slice()
        if (action.taskIdx < 0 || action.taskIdx >= tasks.length) return block
        tasks[action.taskIdx] = action.text
        return { ...block, tasks }
      })
    }
    case 'tokens.add': {
      return updateBlock(state, action.blockIdx, (block) => {
        const id = mintTokenId(collectBlockTokenIds(block))
        const next: FillBlankToken = { id, label: '' }
        const tokenBank = (block.tokenBank ?? []).concat(next)
        return { ...block, tokenBank }
      })
    }
    case 'tokens.delete': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tokenBank = (block.tokenBank ?? []).filter(
          (t) => t.id !== action.tokenId,
        )
        return { ...block, tokenBank }
      })
    }
    case 'tokens.move': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tokenBank = moveItem(block.tokenBank ?? [], action.from, action.to)
        if (tokenBank === block.tokenBank) return block
        return { ...block, tokenBank }
      })
    }
    case 'tokens.edit': {
      return updateBlock(state, action.blockIdx, (block) => {
        const tokenBank = (block.tokenBank ?? []).map((t) =>
          t.id === action.tokenId ? { ...t, label: action.label } : t,
        )
        return { ...block, tokenBank }
      })
    }
    case 'save.start': {
      return { ...state, saveState: 'saving', saveError: null }
    }
    case 'save.success': {
      return { ...state, saveState: 'saved', saveError: null, dirty: false }
    }
    case 'save.error': {
      return { ...state, saveState: 'error', saveError: action.message }
    }
    default:
      return state
  }
}

export type EditActions = {
  blocks: {
    add: (atIndex: number) => void
    delete: (blockIdx: number) => void
    move: (from: number, to: number) => void
    updateMeta: (blockIdx: number, partial: BlockMetaPartial) => void
  }
  lines: {
    add: (blockIdx: number, atIndex: number) => void
    delete: (blockIdx: number, lineIdx: number) => void
    move: (blockIdx: number, from: number, to: number) => void
    editSegments: (
      blockIdx: number,
      lineIdx: number,
      segments: LineSegment[],
    ) => void
    editExplanation: (
      blockIdx: number,
      lineIdx: number,
      explanation: string,
    ) => void
    editLessonRefs: (
      blockIdx: number,
      lineIdx: number,
      refs: string[],
    ) => void
  }
  blanks: {
    insert: (
      blockIdx: number,
      lineIdx: number,
      segmentPosition: number,
      mode: BlankInputMode,
    ) => void
    add: (blockIdx: number, blank: FinalProjectBlank) => void
    remove: (blockIdx: number, blankId: string) => void
    update: (
      blockIdx: number,
      blankId: string,
      partial: Partial<FinalProjectBlank>,
    ) => void
  }
  tasks: {
    add: (blockIdx: number) => void
    delete: (blockIdx: number, taskIdx: number) => void
    move: (blockIdx: number, from: number, to: number) => void
    edit: (blockIdx: number, taskIdx: number, text: string) => void
  }
  tokens: {
    add: (blockIdx: number) => void
    delete: (blockIdx: number, tokenId: string) => void
    move: (blockIdx: number, from: number, to: number) => void
    edit: (blockIdx: number, tokenId: string, label: string) => void
  }
}

export type UseLessonDraftReturn = {
  draft: DraftLesson
  dirty: boolean
  saveState: SaveState
  saveError: string | null
  actions: EditActions
  save: (lessonId: string) => Promise<void>
}

export function useLessonDraft(initialLesson: Lesson): UseLessonDraftReturn {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    draft: lessonToDraft(initialLesson),
    dirty: false,
    saveState: 'idle' as SaveState,
    saveError: null,
  }))

  const actions: EditActions = useMemo(
    () => ({
      blocks: {
        add: (atIndex) => dispatch({ type: 'blocks.add', atIndex }),
        delete: (blockIdx) => dispatch({ type: 'blocks.delete', blockIdx }),
        move: (from, to) => dispatch({ type: 'blocks.move', from, to }),
        updateMeta: (blockIdx, partial) =>
          dispatch({ type: 'blocks.updateMeta', blockIdx, partial }),
      },
      lines: {
        add: (blockIdx, atIndex) =>
          dispatch({ type: 'lines.add', blockIdx, atIndex }),
        delete: (blockIdx, lineIdx) =>
          dispatch({ type: 'lines.delete', blockIdx, lineIdx }),
        move: (blockIdx, from, to) =>
          dispatch({ type: 'lines.move', blockIdx, from, to }),
        editSegments: (blockIdx, lineIdx, segments) =>
          dispatch({ type: 'lines.editSegments', blockIdx, lineIdx, segments }),
        editExplanation: (blockIdx, lineIdx, explanation) =>
          dispatch({
            type: 'lines.editExplanation',
            blockIdx,
            lineIdx,
            explanation,
          }),
        editLessonRefs: (blockIdx, lineIdx, refs) =>
          dispatch({ type: 'lines.editLessonRefs', blockIdx, lineIdx, refs }),
      },
      blanks: {
        insert: (blockIdx, lineIdx, segmentPosition, mode) =>
          dispatch({
            type: 'blanks.insert',
            blockIdx,
            lineIdx,
            segmentPosition,
            mode,
          }),
        add: (blockIdx, blank) => dispatch({ type: 'blanks.add', blockIdx, blank }),
        remove: (blockIdx, blankId) =>
          dispatch({ type: 'blanks.remove', blockIdx, blankId }),
        update: (blockIdx, blankId, partial) =>
          dispatch({ type: 'blanks.update', blockIdx, blankId, partial }),
      },
      tasks: {
        add: (blockIdx) => dispatch({ type: 'tasks.add', blockIdx }),
        delete: (blockIdx, taskIdx) =>
          dispatch({ type: 'tasks.delete', blockIdx, taskIdx }),
        move: (blockIdx, from, to) =>
          dispatch({ type: 'tasks.move', blockIdx, from, to }),
        edit: (blockIdx, taskIdx, text) =>
          dispatch({ type: 'tasks.edit', blockIdx, taskIdx, text }),
      },
      tokens: {
        add: (blockIdx) => dispatch({ type: 'tokens.add', blockIdx }),
        delete: (blockIdx, tokenId) =>
          dispatch({ type: 'tokens.delete', blockIdx, tokenId }),
        move: (blockIdx, from, to) =>
          dispatch({ type: 'tokens.move', blockIdx, from, to }),
        edit: (blockIdx, tokenId, label) =>
          dispatch({ type: 'tokens.edit', blockIdx, tokenId, label }),
      },
    }),
    [],
  )

  const save = useCallback(async (lessonId: string) => {
    dispatch({ type: 'save.start' })
    const lesson = draftToLesson(state.draft)
    try {
      const res = await fetch('/api/admin/save-lesson', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lessonId, lesson }),
      })
      if (!res.ok) {
        let message = `Save failed (${res.status})`
        try {
          const body = (await res.json()) as {
            message?: string
            error?: string
            issues?: string[]
          }
          if (body.issues && body.issues.length > 0) {
            message = body.issues.join('; ')
          } else if (body.message) {
            message = body.message
          } else if (body.error) {
            message = body.error
          }
        } catch {
          // ignore body parse failure
        }
        dispatch({ type: 'save.error', message })
        return
      }
      dispatch({ type: 'save.success' })
    } catch (err) {
      dispatch({
        type: 'save.error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }, [state.draft])

  return {
    draft: state.draft,
    dirty: state.dirty,
    saveState: state.saveState,
    saveError: state.saveError,
    actions,
    save,
  }
}
