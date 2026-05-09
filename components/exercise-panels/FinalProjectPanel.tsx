'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { BlankDetailPanel } from '@/components/admin/BlankDetailPanel'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import { mintBlankId } from '@/lib/admin/id'
import type {
  BlankInputMode,
  Exercise,
  ExpectedEffect,
  FinalProjectBlank,
  FinalProjectFile,
  FinalProjectLine,
  Lesson,
} from '@/lib/lessons'
import { runInProjectSandbox } from '@/lib/projectSandbox'
import { PrismEditor } from '@/components/PrismEditor'

type FinalProjectPanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
  allExercises: Exercise[]
  activeIndex: number
  lesson: Lesson
  onActiveBankIndexChange?: (index: number) => void
  onLineSelect?: (
    lineIndex: number | null,
    blankIndex: number | null,
  ) => void
  editMode?: boolean
  editActions?: EditActions
  blockIdx?: number
}

type AdminBlankPanelState = {
  blockIdx: number
  blankId: string
  anchorRect: { left: number; top: number; bottom: number; right: number }
} | null

type AdminActiveLine = { blockIdx: number; lineIdx: number } | null
type AdminActiveSelection = {
  segmentIdx: number
  start: number
  end: number
  selectedText: string
} | null

type AnswerState = 'idle' | 'checking' | 'correct' | 'wrong'
type BlankStatus = 'idle' | 'correct' | 'wrong'

type Token = { kind: string; value: string }

type LineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'blank'; id: string }

const BLANK_RE = /<<([^>]+)>>/g

const KEYWORDS = new Set([
  'let',
  'const',
  'var',
  'if',
  'else',
  'return',
  'function',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'typeof',
  'in',
  'of',
  'true',
  'false',
  'null',
  'undefined',
])

function tokenize(src: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const eol = src.indexOf('\n', i)
      const end = eol === -1 ? src.length : eol
      out.push({ kind: 'comment', value: src.slice(i, end) })
      i = end
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      let j = i + 1
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j += 2
        else j += 1
      }
      out.push({ kind: 'string', value: src.slice(i, j + 1) })
      i = Math.min(j + 1, src.length)
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1
      out.push({ kind: 'number', value: src.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j += 1
      const ident = src.slice(i, j)
      if (KEYWORDS.has(ident)) {
        out.push({ kind: 'keyword', value: ident })
      } else if (src[j] === '(') {
        out.push({ kind: 'fn', value: ident })
      } else {
        out.push({ kind: 'ident', value: ident })
      }
      i = j
      continue
    }
    if (c === ' ' || c === '\t') {
      let j = i
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j += 1
      out.push({ kind: 'ws', value: src.slice(i, j) })
      i = j
      continue
    }
    out.push({ kind: 'punct', value: c })
    i += 1
  }
  return out
}

function colorFor(kind: string): string | undefined {
  if (kind === 'keyword') return '#cba6f7'
  if (kind === 'string') return '#a6e3a1'
  if (kind === 'number') return '#fab387'
  if (kind === 'comment') return '#6c7086'
  if (kind === 'fn') return '#89b4fa'
  return undefined
}

function HighlightedText({ value, dim }: { value: string; dim?: boolean }) {
  const tokens = useMemo(() => tokenize(value), [value])
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.kind === 'ws') return <Fragment key={i}>{tok.value}</Fragment>
        const color = dim ? '#6c7086' : colorFor(tok.kind) ?? '#cdd6f4'
        const style: React.CSSProperties = {
          color,
          fontStyle: tok.kind === 'comment' ? 'italic' : undefined,
        }
        return (
          <span key={i} style={style}>
            {tok.value}
          </span>
        )
      })}
    </>
  )
}

function parseLineSegments(text: string): LineSegment[] {
  const segments: LineSegment[] = []
  let cursor = 0
  const re = new RegExp(BLANK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: text.slice(cursor, match.index) })
    }
    segments.push({ kind: 'blank', id: match[1] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) })
  }
  if (segments.length === 0) {
    segments.push({ kind: 'text', value: '' })
  }
  return segments
}

function extractBlankIds(text: string): string[] {
  const ids: string[] = []
  const re = new RegExp(BLANK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    ids.push(match[1])
  }
  return ids
}

function splitToLines(s: string): string[] {
  if (!s) return []
  const lines = s.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

function extractTopLevelDecls(code: string): string {
  const codeLines = code.split('\n')
  const out: string[] = []
  let depth = 0
  let inString: string | null = null
  for (const line of codeLines) {
    const trimmed = line.trim()
    if (depth === 0 && inString === null) {
      if (/^(let|const|var)\s+/.test(trimmed)) {
        out.push(line)
      }
    }
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i]
      if (inString) {
        if (c === '\\') {
          i += 1
          continue
        }
        if (c === inString) inString = null
        continue
      }
      if (c === "'" || c === '"' || c === '`') {
        inString = c
        continue
      }
      if (c === '/' && line[i + 1] === '/') break
      if (c === '{' || c === '(' || c === '[') depth += 1
      else if (c === '}' || c === ')' || c === ']') depth = Math.max(0, depth - 1)
    }
    inString = null
  }
  return out.join('\n')
}

function buildBlankMap(
  blanks: FinalProjectBlank[],
): Map<string, FinalProjectBlank> {
  const m = new Map<string, FinalProjectBlank>()
  for (const b of blanks) m.set(b.id, b)
  return m
}

function fillLineFromMap(
  text: string,
  resolve: (id: string) => string,
): string {
  return text.replace(new RegExp(BLANK_RE.source, 'g'), (_, id: string) =>
    resolve(id),
  )
}

type BlockHeaderProps = {
  index: number
  title: string
  state: 'done' | 'active' | 'locked'
}

function BlockHeader({ index, title, state }: BlockHeaderProps) {
  const color =
    state === 'done' ? '#a6e3a1' : state === 'active' ? '#89b4fa' : '#45475a'
  const suffix =
    state === 'done'
      ? 'completed'
      : state === 'active'
        ? 'fill in the blanks'
        : 'locked'
  return (
    <div className="fp-block-header" style={{ color }}>
      <span
        className="fp-block-header-dot"
        style={{ background: color }}
        aria-hidden
      />
      <span>
        Block {index + 1} - {title} - {suffix}
      </span>
    </div>
  )
}

type CodeLineProps = {
  lineNumber: number
  children: React.ReactNode
  extraClass?: string
  onClick?: (event: React.MouseEvent) => void
  adminGutter?: React.ReactNode
}

function CodeLine({
  lineNumber,
  children,
  extraClass,
  onClick,
  adminGutter,
}: CodeLineProps) {
  return (
    <div
      className={`fp-code-line${extraClass ? ` ${extraClass}` : ''}`}
      onClick={onClick}
    >
      <span className="fp-line-num">{lineNumber}</span>
      {adminGutter}
      <span style={{ flex: 1, whiteSpace: 'pre' }}>{children}</span>
    </div>
  )
}

type AdminTextSegmentProps = {
  blockIdx: number
  lineIdx: number
  segmentIdx: number
  value: string
  onCommit: (next: string) => void
  onSelectionChange: (
    location: { blockIdx: number; lineIdx: number },
    selection: AdminActiveSelection,
  ) => void
  onLineFocus: (location: { blockIdx: number; lineIdx: number }) => void
  onLineBlur: () => void
}

function AdminTextSegment({
  blockIdx,
  lineIdx,
  segmentIdx,
  value,
  onCommit,
  onSelectionChange,
  onLineFocus,
  onLineBlur,
}: AdminTextSegmentProps) {
  const reportSelection = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const s = el.selectionStart ?? 0
    const en = el.selectionEnd ?? 0
    if (s !== en) {
      onSelectionChange(
        { blockIdx, lineIdx },
        {
          segmentIdx,
          start: s,
          end: en,
          selectedText: el.value.slice(s, en),
        },
      )
    } else {
      onSelectionChange({ blockIdx, lineIdx }, null)
    }
  }

  return (
    <input
      className="admin-line-text-input"
      value={value}
      spellCheck={false}
      size={Math.max(2, value.length + 1)}
      onChange={(e) => onCommit(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onMouseUp={reportSelection}
      onSelect={reportSelection}
      onKeyUp={reportSelection}
      onFocus={() => onLineFocus({ blockIdx, lineIdx })}
      onBlur={onLineBlur}
    />
  )
}

const LOCKED_PLACEHOLDER_WIDTHS = ['60%', '45%', '70%', '55%', '65%']

export function FinalProjectPanel({
  exercise,
  onComplete,
  allExercises,
  activeIndex,
  lesson,
  onActiveBankIndexChange,
  onLineSelect,
  editMode = false,
  editActions,
  blockIdx,
}: FinalProjectPanelProps) {
  const [blankPanel, setBlankPanel] = useState<AdminBlankPanelState>(null)
  const [activeLine, setActiveLine] = useState<AdminActiveLine>(null)
  const [activeSelection, setActiveSelection] =
    useState<AdminActiveSelection>(null)
  const [blankTypeMenuOpen, setBlankTypeMenuOpen] = useState(false)
  const editingBlockIdx = blockIdx ?? activeIndex
  const [activeFile, setActiveFile] = useState<FinalProjectFile>('script')
  const [dropValues, setDropValues] = useState<Record<string, string>>({})
  const [completedDropValues, setCompletedDropValues] = useState<
    Record<number, Record<string, string>>
  >({})
  const [completedTypedValues, setCompletedTypedValues] = useState<
    Record<number, Record<string, string>>
  >({})
  const [blankStates, setBlankStates] = useState<Record<string, BlankStatus>>(
    {},
  )
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null)
  const [hoverBlankId, setHoverBlankId] = useState<string | null>(null)
  const [activeBankIndex, setActiveBankIndex] = useState<number>(0)
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(
    null,
  )
  const [selectedBlankIndex, setSelectedBlankIndex] = useState<number | null>(
    null,
  )
  const [editedHtml, setEditedHtml] = useState<string>(
    lesson.finalProject?.htmlTemplate ?? '',
  )
  const [editedCss, setEditedCss] = useState<string>(
    lesson.finalProject?.cssTemplate ?? '',
  )
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allDone = activeIndex >= allExercises.length

  const lines = exercise.lines ?? []
  const blanks = exercise.blanks ?? []
  const tokens = exercise.tokenBank ?? []
  const blanksById = useMemo(() => buildBlankMap(blanks), [blanks])
  const blankCount = blanks.length

  const modeOf = (id: string): BlankInputMode =>
    blanksById.get(id)?.mode ?? 'wordbank'

  const [typedValues, setTypedValues] = useState<Record<string, string>>({})
  const typedInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setDropValues({})
    setBlankStates({})
    setAnswerState('idle')
    setDraggingTokenId(null)
    setHoverBlankId(null)
    setActiveBankIndex(0)
    setSelectedLineIndex(null)
    setSelectedBlankIndex(null)
    setTypedValues({})
    setFeedbackMessage('')
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [activeIndex, exercise.title, blankCount])

  useEffect(() => {
    onActiveBankIndexChange?.(activeBankIndex)
  }, [activeBankIndex, onActiveBankIndexChange])

  useEffect(() => {
    onLineSelect?.(selectedLineIndex, selectedBlankIndex)
  }, [selectedLineIndex, selectedBlankIndex, onLineSelect])

  const handleLineClick = (lineIdx: number, blankIdx: number | null) => {
    setSelectedLineIndex(lineIdx)
    setSelectedBlankIndex(blankIdx)
    if (blankIdx !== null) {
      setActiveBankIndex(blankIdx)
    }
  }

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const isBlankFilled = (i: number) => {
    const blank = blanks[i]
    if (!blank) return false
    const m = blank.mode
    if (m === 'wordbank') return dropValues[blank.id] !== undefined
    return (typedValues[blank.id] ?? '').trim().length > 0
  }

  const allFilled =
    blankCount > 0 &&
    Array.from({ length: blankCount }, (_, i) => i).every(isBlankFilled)

  const advanceActiveBankIndex = (filledIdx: number) => {
    setActiveBankIndex((cur) => {
      if (filledIdx < cur) return cur
      let nextIdx = filledIdx + 1
      while (nextIdx < blankCount && isBlankFilled(nextIdx)) {
        nextIdx += 1
      }
      if (nextIdx >= blankCount) {
        return blankCount > 0 ? blankCount - 1 : 0
      }
      return nextIdx
    })
  }

  const placeToken = (blankId: string, label: string) => {
    if (answerState === 'correct') return
    if (blankStates[blankId] === 'correct') return
    if (modeOf(blankId) !== 'wordbank') return
    setDropValues((prev) => ({ ...prev, [blankId]: label }))
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setBlankStates({})
    }
    const idx = blanks.findIndex((b) => b.id === blankId)
    if (idx >= 0) advanceActiveBankIndex(idx)
  }

  const clearBlank = (blankId: string) => {
    if (answerState === 'correct') return
    if (blankStates[blankId] === 'correct') return
    if (dropValues[blankId] === undefined) return
    setDropValues((prev) => {
      const next = { ...prev }
      delete next[blankId]
      return next
    })
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setBlankStates({})
    }
  }

  const setTypedAt = (blankId: string, value: string) => {
    setTypedValues((prev) => ({ ...prev, [blankId]: value }))
    if (blankStates[blankId] === 'wrong') {
      setBlankStates((prev) => {
        const next = { ...prev }
        delete next[blankId]
        return next
      })
    }
    if (answerState === 'wrong') {
      setAnswerState('idle')
    }
    if (feedbackMessage) setFeedbackMessage('')
  }

  const buildContextForFreeline = (blankId: string): string => {
    const parts: string[] = []

    for (let idx = 0; idx < activeIndex; idx += 1) {
      const block = allExercises[idx]
      if (block.codePrefix) parts.push(block.codePrefix)
      const blockLines = block.lines ?? []
      const blockBlanks = block.blanks ?? []
      const blockBlanksById = buildBlankMap(blockBlanks)
      const savedDrops = completedDropValues[idx] ?? {}
      const savedTyped = completedTypedValues[idx] ?? {}

      for (const line of blockLines) {
        const out = fillLineFromMap(line.text, (id) => {
          const blank = blockBlanksById.get(id)
          if (!blank) return ''
          if (blank.mode === 'wordbank') {
            return savedDrops[id] ?? blank.answer ?? ''
          }
          return savedTyped[id] ?? blank.answer ?? ''
        })
        parts.push(out)
      }
      if (block.codeSuffix) parts.push(block.codeSuffix)
    }

    if (exercise.codePrefix) parts.push(exercise.codePrefix)

    for (const line of lines) {
      if (extractBlankIds(line.text).includes(blankId)) {
        break
      }
      const out = fillLineFromMap(line.text, (id) => {
        const blank = blanksById.get(id)
        if (!blank) return ''
        if (blank.mode === 'wordbank') {
          return dropValues[id] ?? blank.answer ?? ''
        }
        return (typedValues[id] ?? '').trim() || blank.answer || ''
      })
      parts.push(out)
    }

    if (exercise.codeSuffix) parts.push(exercise.codeSuffix)
    for (let idx = activeIndex + 1; idx < allExercises.length; idx += 1) {
      const block = allExercises[idx]
      if (block.codeSuffix) parts.push(block.codeSuffix)
    }

    return extractTopLevelDecls(parts.join('\n'))
  }

  const handleCheck = async () => {
    if (!allFilled) return
    if (answerState === 'checking') return
    setAnswerState('checking')
    setFeedbackMessage('')

    const newStates: Record<string, BlankStatus> = {}
    let allOk = true
    let firstFailMessage = ''

    for (let i = 0; i < blankCount; i += 1) {
      const blank = blanks[i]
      if (!blank) continue
      const id = blank.id
      const m = blank.mode
      let pass = false
      let message = ''

      if (m === 'wordbank') {
        pass = dropValues[id] === blank.answer
      } else if (m === 'type') {
        pass = (typedValues[id] ?? '').trim() === (blank.answer ?? '').trim()
      } else {
        const studentLine = (typedValues[id] ?? '').trim()
        if (studentLine.length === 0) {
          pass = false
          message = 'Type a line first.'
        } else {
          const expectedEffect: ExpectedEffect =
            blank.expectedEffect ?? { type: 'noError' }
          const contextCode = buildContextForFreeline(id)
          const studentCode = contextCode + '\n' + studentLine
          const result = await runInProjectSandbox(
            lesson.finalProject?.htmlTemplate ?? '',
            lesson.finalProject?.cssTemplate ?? '',
            studentCode,
            expectedEffect,
            6000,
          )
          pass = result.pass
          message = result.message
        }
      }

      newStates[id] = pass ? 'correct' : 'wrong'
      if (!pass) {
        allOk = false
        if (!firstFailMessage && message) firstFailMessage = message
      }
    }

    setBlankStates(newStates)
    if (allOk) {
      setAnswerState('correct')
      setFeedbackMessage('')
    } else {
      setAnswerState('wrong')
      if (firstFailMessage) setFeedbackMessage(firstFailMessage)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setDropValues((prev) => {
          const next = { ...prev }
          for (const blank of blanks) {
            if (
              newStates[blank.id] === 'wrong' &&
              blank.mode === 'wordbank'
            ) {
              delete next[blank.id]
            }
          }
          return next
        })
        setTypedValues((prev) => {
          const next = { ...prev }
          for (const blank of blanks) {
            if (
              newStates[blank.id] === 'wrong' &&
              blank.mode !== 'wordbank'
            ) {
              next[blank.id] = ''
            }
          }
          return next
        })
        setBlankStates((prev) => {
          const next = { ...prev }
          for (const blank of blanks) {
            if (newStates[blank.id] === 'wrong') delete next[blank.id]
          }
          return next
        })
        setAnswerState('idle')
        setFeedbackMessage('')
        resetTimerRef.current = null
      }, 1200)
    }
  }

  const handleNext = () => {
    setCompletedDropValues((prev) => ({
      ...prev,
      [activeIndex]: { ...dropValues },
    }))
    setCompletedTypedValues((prev) => ({
      ...prev,
      [activeIndex]: { ...typedValues },
    }))
    onComplete(true)
  }

  const handleAdminLineFocus = (loc: { blockIdx: number; lineIdx: number }) => {
    setActiveLine(loc)
    setActiveSelection(null)
    setBlankTypeMenuOpen(false)
  }

  const handleAdminLineBlur = () => {
    setActiveLine(null)
    setActiveSelection(null)
    setBlankTypeMenuOpen(false)
  }

  const handleAdminSelectionChange = (
    loc: { blockIdx: number; lineIdx: number },
    sel: AdminActiveSelection,
  ) => {
    setActiveLine(loc)
    setActiveSelection(sel)
    if (sel === null) setBlankTypeMenuOpen(false)
  }

  const insertBlankFromSelection = (mode: BlankInputMode) => {
    if (!editActions || !activeLine || !activeSelection) return
    const block = allExercises[activeLine.blockIdx]
    if (!block) return
    const blockLines = block.lines ?? []
    const line = blockLines[activeLine.lineIdx]
    if (!line) return

    const parsed = parseLineSegments(line.text)
    const target = parsed[activeSelection.segmentIdx]
    if (!target || target.kind !== 'text') return

    const { start, end, selectedText } = activeSelection
    const before = target.value.slice(0, start)
    const after = target.value.slice(end)

    const existingIds = new Set<string>()
    for (const b of block.blanks ?? []) existingIds.add(b.id)
    const newId = mintBlankId(existingIds)

    const replacement: Array<
      | { kind: 'text'; value: string }
      | { kind: 'blank'; blankId: string }
    > = []
    if (before.length > 0) replacement.push({ kind: 'text', value: before })
    replacement.push({ kind: 'blank', blankId: newId })
    if (after.length > 0) replacement.push({ kind: 'text', value: after })

    const converted = parsed.map((s) =>
      s.kind === 'text'
        ? { kind: 'text' as const, value: s.value }
        : { kind: 'blank' as const, blankId: s.id },
    )
    const newSegs = [
      ...converted.slice(0, activeSelection.segmentIdx),
      ...replacement,
      ...converted.slice(activeSelection.segmentIdx + 1),
    ]

    editActions.lines.editSegments(
      activeLine.blockIdx,
      activeLine.lineIdx,
      newSegs,
    )
    editActions.blanks.add(activeLine.blockIdx, {
      id: newId,
      mode,
      answer: selectedText,
      instruction: '',
      explanation: '',
    })

    setActiveSelection(null)
    setBlankTypeMenuOpen(false)
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const ce = event as CustomEvent
      if (
        ce.detail &&
        typeof (ce.detail as { format?: string }).format === 'string' &&
        (ce.detail as { format: string }).format !== 'final-project'
      ) {
        return
      }
      handleCheck()
    }
    document.addEventListener('panel:check-answer', handler)
    return () => document.removeEventListener('panel:check-answer', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropValues, typedValues, blankStates, answerState, allFilled])

  const renderDropZone = (blankId: string, lineIdx?: number) => {
    const filled = dropValues[blankId]
    const status = blankStates[blankId]
    const isHover = hoverBlankId === blankId
    let cls = 'fp-drop-zone'
    if (status === 'correct' || (filled && answerState === 'correct')) {
      cls += ' fp-dz-correct'
    } else if (status === 'wrong') {
      cls += ' fp-dz-wrong'
    } else if (isHover) {
      cls += ' fp-dz-over'
    } else if (filled !== undefined) {
      cls += ' fp-dz-filled'
    } else {
      cls += ' fp-dz-empty'
    }
    const blankIdx = blanks.findIndex((b) => b.id === blankId)
    return (
      <span
        key={`dz-${blankId}`}
        className={cls}
        onDragOver={(e) => {
          e.preventDefault()
          if (hoverBlankId !== blankId) setHoverBlankId(blankId)
        }}
        onDragLeave={() => {
          if (hoverBlankId === blankId) setHoverBlankId(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          const tokenId = e.dataTransfer.getData('text/plain')
          const tok = tokens.find((t) => t.id === tokenId)
          if (tok) placeToken(blankId, tok.label)
          setHoverBlankId(null)
          setDraggingTokenId(null)
          if (lineIdx !== undefined) handleLineClick(lineIdx, blankIdx)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (lineIdx !== undefined) handleLineClick(lineIdx, blankIdx)
          clearBlank(blankId)
        }}
        role="button"
      >
        {filled !== undefined ? (
          filled
        ) : (
          <span className="fp-dz-hint">?</span>
        )}
      </span>
    )
  }

  const renderTypeInput = (blankId: string, lineIdx?: number) => {
    const status = blankStates[blankId]
    const value = typedValues[blankId] ?? ''
    let cls = 'fp-type-input'
    if (status === 'correct' || (value && answerState === 'correct')) {
      cls += ' correct'
    } else if (status === 'wrong') {
      cls += ' wrong'
    }
    const sized = Math.max(8, value.length + 2)
    const blankIdx = blanks.findIndex((b) => b.id === blankId)
    return (
      <input
        key={`ti-${blankId}`}
        ref={(el) => {
          typedInputRefs.current[blankId] = el
        }}
        type="text"
        className={cls}
        value={value}
        size={sized}
        placeholder="..."
        spellCheck={false}
        autoComplete="off"
        disabled={
          answerState === 'checking' ||
          status === 'correct' ||
          answerState === 'correct'
        }
        onChange={(e) => setTypedAt(blankId, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            let nextId: string | null = null
            for (let k = blankIdx + 1; k < blankCount; k += 1) {
              const cand = blanks[k]
              if (!cand) continue
              if (blankStates[cand.id] !== 'correct' && !isBlankFilled(k)) {
                nextId = cand.id
                break
              }
            }
            if (nextId) {
              const target = typedInputRefs.current[nextId]
              if (target) target.focus()
            }
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onFocus={() => {
          if (lineIdx !== undefined) {
            handleLineClick(lineIdx, blankIdx)
          } else if (blankIdx >= 0) {
            setActiveBankIndex(blankIdx)
          }
        }}
      />
    )
  }

  const renderFreelineInput = (blankId: string, lineIdx?: number) => {
    const status = blankStates[blankId]
    const value = typedValues[blankId] ?? ''
    let cls = 'fp-freeline-input'
    if (status === 'correct' || (value && answerState === 'correct')) {
      cls += ' correct'
    } else if (status === 'wrong') {
      cls += ' wrong'
    }
    const blankIdx = blanks.findIndex((b) => b.id === blankId)
    return (
      <input
        key={`fl-${blankId}`}
        ref={(el) => {
          typedInputRefs.current[blankId] = el
        }}
        type="text"
        className={cls}
        value={value}
        placeholder="// type the complete line here"
        spellCheck={false}
        autoComplete="off"
        disabled={
          answerState === 'checking' ||
          status === 'correct' ||
          answerState === 'correct'
        }
        onChange={(e) => setTypedAt(blankId, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (allFilled) handleCheck()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onFocus={() => {
          if (lineIdx !== undefined) {
            handleLineClick(lineIdx, blankIdx)
          } else if (blankIdx >= 0) {
            setActiveBankIndex(blankIdx)
          }
        }}
      />
    )
  }

  const renderCompletedLineSegments = (
    text: string,
    blockBlanksById: Map<string, FinalProjectBlank>,
    savedDrops: Record<string, string>,
    savedTyped: Record<string, string>,
  ) => {
    const segs = parseLineSegments(text)
    return (
      <>
        {segs.map((seg, i) => {
          if (seg.kind === 'text') {
            return <HighlightedText key={i} value={seg.value} />
          }
          const blank = blockBlanksById.get(seg.id)
          const ans =
            !blank
              ? ''
              : blank.mode === 'wordbank'
                ? savedDrops[seg.id] ?? blank.answer ?? ''
                : savedTyped[seg.id] ?? blank.answer ?? ''
          return (
            <span key={i} className="fp-drop-zone fp-dz-filled">
              {ans}
            </span>
          )
        })}
      </>
    )
  }

  let currentLineNumber = 1
  const renderBlock = (block: Exercise, idx: number) => {
    const studentState: 'done' | 'active' | 'locked' =
      idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'locked'
    const state: 'done' | 'active' | 'locked' = editMode
      ? 'active'
      : studentState
    const cls = `fp-code-block ${
      state === 'done'
        ? 'fp-cb-done'
        : state === 'active'
          ? 'fp-cb-active'
          : 'fp-cb-locked'
    }`
    const blockLines: FinalProjectLine[] = block.lines ?? []
    const blockBlanks: FinalProjectBlank[] = block.blanks ?? []
    const blockBlanksById = buildBlankMap(blockBlanks)
    const suffixLines = splitToLines(block.codeSuffix ?? '')
    const savedDrops = completedDropValues[idx] ?? {}
    const savedTyped = completedTypedValues[idx] ?? {}

    if (state === 'locked') {
      return (
        <div key={`${block.title}-${idx}`} className={cls}>
          <BlockHeader index={idx} title={block.title} state={state} />
          {blockLines.map((_line, i) => {
            const num = currentLineNumber
            currentLineNumber += 1
            const width =
              LOCKED_PLACEHOLDER_WIDTHS[i % LOCKED_PLACEHOLDER_WIDTHS.length]
            return (
              <CodeLine key={`b-${i}`} lineNumber={num}>
                <span
                  className="fp-locked-placeholder"
                  style={{ width }}
                  aria-hidden
                />
              </CodeLine>
            )
          })}
        </div>
      )
    }

    let activeLineIndex = -1
    if (state === 'active' && !editMode) {
      const activeBlankId = blanks[activeBankIndex]?.id
      if (activeBlankId) {
        activeLineIndex = blockLines.findIndex((l) =>
          extractBlankIds(l.text).includes(activeBlankId),
        )
      }
    }

    const renderAdminGutter = (lineIdx: number): React.ReactNode => {
      if (!editMode || !editActions) return null
      return (
        <span className="admin-line-gutter" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="admin-icon-btn"
            title="Move line up"
            onClick={() => editActions.lines.move(idx, lineIdx, lineIdx - 1)}
            disabled={lineIdx === 0}
          >
            ↑
          </button>
          <button
            type="button"
            className="admin-icon-btn"
            title="Move line down"
            onClick={() => editActions.lines.move(idx, lineIdx, lineIdx + 1)}
            disabled={lineIdx === blockLines.length - 1}
          >
            ↓
          </button>
          <button
            type="button"
            className="admin-icon-btn danger"
            title="Delete line"
            onClick={() => editActions.lines.delete(idx, lineIdx)}
          >
            ×
          </button>
        </span>
      )
    }

    const adminAddLineDivider = (insertAt: number): React.ReactNode => {
      if (!editMode || !editActions) return null
      return (
        <div
          className="admin-line-add-divider"
          onClick={() => editActions.lines.add(idx, insertAt)}
        />
      )
    }

    const editText = (
      lineIdx: number,
      segIdx: number,
      nextValue: string,
    ) => {
      if (!editActions) return
      const cur = blockLines[lineIdx]
      if (!cur) return
      const segs = parseLineSegments(cur.text).map((s) =>
        s.kind === 'text'
          ? { kind: 'text' as const, value: s.value }
          : { kind: 'blank' as const, blankId: s.id },
      )
      // ensure the array is long enough
      if (segIdx < 0 || segIdx >= segs.length) return
      const target = segs[segIdx]
      if (target.kind !== 'text') return
      segs[segIdx] = { kind: 'text', value: nextValue }
      editActions.lines.editSegments(idx, lineIdx, segs)
    }

    const openBlankPanel = (blankId: string, anchor: HTMLElement) => {
      const rect = anchor.getBoundingClientRect()
      setBlankPanel({
        blockIdx: idx,
        blankId,
        anchorRect: {
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom,
          right: rect.right,
        },
      })
    }

    return (
      <div key={`${block.title}-${idx}`} className={cls}>
        <BlockHeader index={idx} title={block.title} state={state} />
        {editMode && editActions && blockLines.length === 0 ? (
          <div
            className="admin-line-add-divider"
            onClick={() => editActions.lines.add(idx, 0)}
            style={{ marginTop: 6 }}
          />
        ) : null}
        {blockLines.map((line, i) => {
          const num = currentLineNumber
          currentLineNumber += 1
          const idsOnLine = extractBlankIds(line.text)
          const freelineBlankId = idsOnLine.find((id) => {
            const blank = blockBlanksById.get(id)
            return blank?.mode === 'freeline'
          })

          const lineNode: React.ReactNode = (() => {
            if (state === 'done') {
              if (freelineBlankId !== undefined) {
                const typedAns = savedTyped[freelineBlankId] ?? ''
                return (
                  <CodeLine key={`b-${i}`} lineNumber={num}>
                    <HighlightedText value={typedAns} />
                  </CodeLine>
                )
              }
              return (
                <CodeLine key={`b-${i}`} lineNumber={num}>
                  {renderCompletedLineSegments(
                    line.text,
                    blockBlanksById,
                    savedDrops,
                    savedTyped,
                  )}
                </CodeLine>
              )
            }

            const classes: string[] = []
            if (!editMode) {
              classes.push('clickable')
            }
            if (i === activeLineIndex) {
              classes.push('fp-active-line')
            } else if (!editMode && i === selectedLineIndex) {
              classes.push('line-selected')
            }
            if (editMode) {
              classes.push('admin-edit-line')
              if (
                activeLine &&
                activeLine.blockIdx === idx &&
                activeLine.lineIdx === i
              ) {
                classes.push('admin-active-line')
              }
            }
            const extraClass = classes.join(' ')

            const defaultBlankIdx =
              idsOnLine.length === 1
                ? blanks.findIndex((b) => b.id === idsOnLine[0])
                : null
            const handleClickLine = editMode
              ? undefined
              : () => handleLineClick(i, defaultBlankIdx ?? null)

            const adminGutter = renderAdminGutter(i)

            if (freelineBlankId !== undefined && !editMode) {
              return (
                <CodeLine
                  key={`b-${i}`}
                  lineNumber={num}
                  extraClass={extraClass}
                  onClick={handleClickLine}
                  adminGutter={adminGutter}
                >
                  {renderFreelineInput(freelineBlankId, i)}
                </CodeLine>
              )
            }

            const segments = parseLineSegments(line.text)
            return (
              <CodeLine
                key={`b-${i}`}
                lineNumber={num}
                extraClass={extraClass}
                onClick={handleClickLine}
                adminGutter={adminGutter}
              >
                {segments.map((seg, j) => {
                  if (seg.kind === 'text') {
                    if (editMode) {
                      return (
                        <AdminTextSegment
                          key={j}
                          blockIdx={idx}
                          lineIdx={i}
                          segmentIdx={j}
                          value={seg.value}
                          onCommit={(next) => editText(i, j, next)}
                          onSelectionChange={handleAdminSelectionChange}
                          onLineFocus={handleAdminLineFocus}
                          onLineBlur={handleAdminLineBlur}
                        />
                      )
                    }
                    return <HighlightedText key={j} value={seg.value} />
                  }
                  const m = modeOf(seg.id)
                  let chip: React.ReactNode
                  if (m === 'type') chip = renderTypeInput(seg.id, i)
                  else if (m === 'freeline') {
                    chip = editMode ? (
                      <span className="fp-drop-zone fp-dz-empty">
                        <span className="fp-dz-hint">freeline</span>
                      </span>
                    ) : (
                      renderFreelineInput(seg.id, i)
                    )
                  } else chip = renderDropZone(seg.id, i)
                  if (!editMode) return <Fragment key={j}>{chip}</Fragment>
                  return (
                    <span key={j} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      {chip}
                      <button
                        type="button"
                        className="admin-blank-edit-icon"
                        title="Edit blank"
                        onClick={(e) => {
                          e.stopPropagation()
                          openBlankPanel(seg.id, e.currentTarget)
                        }}
                      >
                        ✎
                      </button>
                    </span>
                  )
                })}
              </CodeLine>
            )
          })()

          return (
            <Fragment key={`line-${i}`}>
              {lineNode}
              {adminAddLineDivider(i + 1)}
            </Fragment>
          )
        })}
        {suffixLines.map((line, i) => {
          const num = currentLineNumber
          currentLineNumber += 1
          return (
            <CodeLine key={`s-${i}`} lineNumber={num}>
              <HighlightedText value={line} dim />
            </CodeLine>
          )
        })}
      </div>
    )
  }

  const codeBlocks = allExercises.map((block, idx) => renderBlock(block, idx))

  const isCorrect = answerState === 'correct'
  const activeBlank = blanks[activeBankIndex]

  const selectionActive =
    activeSelection !== null && activeSelection.selectedText.length > 0

  return (
    <div className="fp-panel">
      {editMode ? (
        <style>{`
          .fp-code-line.admin-edit-line {
            border-left: 2px solid transparent;
            margin-left: -2px;
            background: transparent;
            box-shadow: none;
            outline: none;
          }
          .fp-code-line.admin-edit-line:hover {
            border-left-color: var(--border);
            background: transparent;
          }
          .fp-code-line.admin-edit-line.admin-active-line {
            border-left-color: var(--accent);
            box-shadow: none;
            background: transparent;
          }
          .fp-code-line.admin-edit-line .admin-line-text-input {
            background: transparent;
            border: none;
            outline: none;
            border-radius: 0;
            padding: 0;
            min-width: 0;
          }
        `}</style>
      ) : null}
      {editMode ? (
        <div className="admin-edit-toolbar">
          <div className="admin-toolbar-blank-wrap">
            <button
              type="button"
              className={`admin-toolbar-blank-btn${
                selectionActive ? ' enabled' : ''
              }`}
              disabled={!selectionActive}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (selectionActive) setBlankTypeMenuOpen((v) => !v)
              }}
            >
              + Blank
            </button>
            {blankTypeMenuOpen && selectionActive ? (
              <div
                className="admin-toolbar-blank-menu"
                onMouseDown={(e) => e.preventDefault()}
              >
                <button
                  type="button"
                  onClick={() => insertBlankFromSelection('wordbank')}
                >
                  Word Bank
                </button>
                <button
                  type="button"
                  onClick={() => insertBlankFromSelection('type')}
                >
                  Type
                </button>
                <button
                  type="button"
                  onClick={() => insertBlankFromSelection('freeline')}
                >
                  Free Line
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="fp-file-tabs">
        <button
          type="button"
          className={`fp-file-tab${activeFile === 'script' ? ' active' : ''}`}
          onClick={() => setActiveFile('script')}
        >
          script.js
        </button>
        <button
          type="button"
          className={`fp-file-tab${activeFile === 'html' ? ' active' : ''}`}
          onClick={() => setActiveFile('html')}
        >
          index.html
        </button>
        <button
          type="button"
          className={`fp-file-tab${activeFile === 'css' ? ' active' : ''}`}
          onClick={() => setActiveFile('css')}
        >
          style.css
        </button>
      </div>

      {activeFile === 'script' ? (
        <>
          <div className="fp-code-display">{codeBlocks}</div>
          {allDone ? (
            <div
              className="fp-word-bank"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '13px',
                  color: '#a6e3a1',
                }}
              >
                You built it! The full program is running in the preview.
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: '#a6e3a1',
                }}
              >
                Feel free to edit any line and see what changes.
              </div>
            </div>
          ) : (
            <div className="fp-word-bank">
              <div className="fp-wb-label-row">
                <span className="fp-wb-label">Word bank</span>
                {isCorrect ? (
                  <button
                    type="button"
                    className="fp-wb-next-btn"
                    onClick={handleNext}
                  >
                    Next block →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="fp-wb-check-btn"
                    onClick={handleCheck}
                    disabled={!allFilled || answerState === 'checking'}
                    style={
                      !allFilled || answerState === 'checking'
                        ? { opacity: 0.4, cursor: 'default' }
                        : undefined
                    }
                  >
                    {answerState === 'checking' ? 'Checking...' : 'Check block'}
                  </button>
                )}
              </div>
              <div className="fp-token-bank">
                {tokens.map((token) => {
                  const dragging = draggingTokenId === token.id
                  let cls = 'fp-token'
                  if (dragging) cls += ' fp-token-dragging'
                  if (editMode && editActions) {
                    return (
                      <span key={token.id} className="admin-token-wrap">
                        <input
                          className="admin-token-input"
                          value={token.label}
                          spellCheck={false}
                          onChange={(e) =>
                            editActions.tokens.edit(
                              editingBlockIdx,
                              token.id,
                              e.target.value,
                            )
                          }
                          placeholder="token"
                        />
                        <button
                          type="button"
                          className="admin-token-delete"
                          title="Delete token"
                          onClick={() =>
                            editActions.tokens.delete(editingBlockIdx, token.id)
                          }
                        >
                          ×
                        </button>
                      </span>
                    )
                  }
                  return (
                    <div
                      key={token.id}
                      className={cls}
                      draggable={!isCorrect}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', token.id)
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingTokenId(token.id)
                      }}
                      onDragEnd={() => setDraggingTokenId(null)}
                      onClick={() => {
                        if (!activeBlank) return
                        if (activeBlank.mode !== 'wordbank') return
                        placeToken(activeBlank.id, token.label)
                      }}
                    >
                      {token.label}
                    </div>
                  )
                })}
                {editMode && editActions ? (
                  <button
                    type="button"
                    className="admin-add-token-btn"
                    onClick={() => editActions.tokens.add(editingBlockIdx)}
                  >
                    + Add token
                  </button>
                ) : null}
              </div>
              {answerState === 'wrong'
                ? (() => {
                    const msg =
                      feedbackMessage || 'Some blanks are wrong. Try again.'
                    const isError =
                      !feedbackMessage ||
                      msg.startsWith('Your code has an error:')
                    const variant = isError ? 'fp-fb-err' : 'fp-fb-hint'
                    return (
                      <div className={`fp-feedback ${variant}`}>{msg}</div>
                    )
                  })()
                : null}
              {answerState === 'correct' ? (
                <div className="fp-feedback fp-fb-ok">Block complete!</div>
              ) : null}
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex' }}>
          {activeFile === 'html' ? (
            <PrismEditor
              code={editedHtml}
              language="html"
              onChange={(val) => setEditedHtml(val)}
              readOnly={!allDone}
              readOnlyMessage="Complete all script.js blocks to edit this file"
            />
          ) : (
            <PrismEditor
              code={editedCss}
              language="css"
              onChange={(val) => setEditedCss(val)}
              readOnly={!allDone}
              readOnlyMessage="Complete all script.js blocks to edit this file"
            />
          )}
        </div>
      )}

      {editMode && editActions && blankPanel
        ? (() => {
            const block = allExercises[blankPanel.blockIdx]
            const blank = (block?.blanks ?? []).find(
              (b) => b.id === blankPanel.blankId,
            )
            if (!blank) return null
            return (
              <BlankDetailPanel
                blockIdx={blankPanel.blockIdx}
                blank={blank}
                anchorRect={blankPanel.anchorRect}
                actions={editActions}
                onClose={() => setBlankPanel(null)}
              />
            )
          })()
        : null}
    </div>
  )
}
