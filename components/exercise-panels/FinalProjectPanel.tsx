'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type {
  BlankInputMode,
  Exercise,
  ExpectedEffect,
  FinalProjectFile,
  Lesson,
} from '@/lib/lessons'
import { runInProjectSandbox } from '@/lib/projectSandbox'

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
}

type AnswerState = 'idle' | 'checking' | 'correct' | 'wrong'
type BlankStatus = 'idle' | 'correct' | 'wrong'

type Token = { kind: string; value: string }

type LineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'blank'; index: number }

const BLANK_TOKEN = '___BLANK___'

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

function parseLineForBlanks(line: string, startBlankIndex: number): {
  segments: LineSegment[]
  nextBlankIndex: number
} {
  const segments: LineSegment[] = []
  let cursor = 0
  let blankIndex = startBlankIndex
  while (cursor < line.length) {
    const found = line.indexOf(BLANK_TOKEN, cursor)
    if (found === -1) {
      segments.push({ kind: 'text', value: line.slice(cursor) })
      break
    }
    if (found > cursor) {
      segments.push({ kind: 'text', value: line.slice(cursor, found) })
    }
    segments.push({ kind: 'blank', index: blankIndex })
    blankIndex += 1
    cursor = found + BLANK_TOKEN.length
  }
  if (cursor === 0 && line.length === 0) {
    segments.push({ kind: 'text', value: '' })
  }
  return { segments, nextBlankIndex: blankIndex }
}

function countBlanks(lines: string[]): number {
  let n = 0
  for (const line of lines) {
    let i = 0
    while (true) {
      const found = line.indexOf(BLANK_TOKEN, i)
      if (found === -1) break
      n += 1
      i = found + BLANK_TOKEN.length
    }
  }
  return n
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

function effectIndexFor(blankIndex: number, modes: BlankInputMode[]): number {
  let count = 0
  for (let i = 0; i < blankIndex; i += 1) {
    if (modes[i] === 'freeline') count += 1
  }
  return count
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
}

function CodeLine({ lineNumber, children, extraClass, onClick }: CodeLineProps) {
  return (
    <div
      className={`fp-code-line${extraClass ? ` ${extraClass}` : ''}`}
      onClick={onClick}
    >
      <span className="fp-line-num">{lineNumber}</span>
      <span style={{ flex: 1, whiteSpace: 'pre' }}>{children}</span>
    </div>
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
}: FinalProjectPanelProps) {
  const [activeFile, setActiveFile] = useState<FinalProjectFile>('script')
  const [dropValues, setDropValues] = useState<Record<string, string>>({})
  const [completedDropValues, setCompletedDropValues] = useState<
    Record<number, Record<string, string>>
  >({})
  const [completedTypedValues, setCompletedTypedValues] = useState<
    Record<number, string[]>
  >({})
  const [dropTokenIds, setDropTokenIds] = useState<Record<string, string>>({})
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

  const activeBlanks = exercise.codeWithBlanks ?? []
  const correctOrder = exercise.correctOrder ?? []
  const tokens = exercise.tokenBank ?? []
  const blankInputModes = exercise.blankInputMode ?? []
  const expectedEffects = exercise.expectedEffects ?? []

  const blankCount = useMemo(() => {
    return Math.max(countBlanks(activeBlanks), correctOrder.length)
  }, [activeBlanks, correctOrder.length])

  const modeOf = (i: number): BlankInputMode =>
    blankInputModes[i] ?? 'wordbank'

  const [typedValues, setTypedValues] = useState<string[]>(() =>
    Array(blankCount).fill(''),
  )
  const typedInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setDropValues({})
    setDropTokenIds({})
    setBlankStates({})
    setAnswerState('idle')
    setDraggingTokenId(null)
    setHoverBlankId(null)
    setActiveBankIndex(0)
    setSelectedLineIndex(null)
    setSelectedBlankIndex(null)
    setTypedValues(Array(blankCount).fill(''))
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

  const usedTokenIds = new Set(Object.values(dropTokenIds))

  const isBlankFilled = (i: number) => {
    const m = modeOf(i)
    if (m === 'wordbank') return dropValues[`b${i}`] !== undefined
    return (typedValues[i] ?? '').trim().length > 0
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

  const placeToken = (blankId: string, tokenId: string, label: string) => {
    if (answerState === 'correct') return
    if (blankStates[blankId] === 'correct') return
    const blankIdx = Number(blankId.slice(1))
    if (modeOf(blankIdx) !== 'wordbank') return
    if (usedTokenIds.has(tokenId)) {
      const existingBlank = Object.entries(dropTokenIds).find(
        ([, v]) => v === tokenId,
      )?.[0]
      if (existingBlank && existingBlank !== blankId) {
        const nextDropValues = { ...dropValues }
        delete nextDropValues[existingBlank]
        nextDropValues[blankId] = label
        setDropValues(nextDropValues)
        setDropTokenIds((prev) => {
          const next = { ...prev }
          delete next[existingBlank]
          next[blankId] = tokenId
          return next
        })
        if (answerState === 'wrong') {
          setAnswerState('idle')
          setBlankStates({})
        }
        advanceActiveBankIndex(blankIdx)
      }
      return
    }
    const nextDropValues = { ...dropValues, [blankId]: label }
    setDropValues(nextDropValues)
    setDropTokenIds((prev) => ({ ...prev, [blankId]: tokenId }))
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setBlankStates({})
    }
    advanceActiveBankIndex(blankIdx)
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
    setDropTokenIds((prev) => {
      const next = { ...prev }
      delete next[blankId]
      return next
    })
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setBlankStates({})
    }
  }

  const setTypedAt = (index: number, value: string) => {
    setTypedValues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
    if (blankStates[`b${index}`] === 'wrong') {
      setBlankStates((prev) => {
        const next = { ...prev }
        delete next[`b${index}`]
        return next
      })
    }
    if (answerState === 'wrong') {
      setAnswerState('idle')
    }
    if (feedbackMessage) setFeedbackMessage('')
  }

  const buildContextForFreeline = (blankIndex: number): string => {
    const parts: string[] = []

    for (let idx = 0; idx < activeIndex; idx += 1) {
      const block = allExercises[idx]
      if (block.codePrefix) parts.push(block.codePrefix)
      const blanksLines = block.codeWithBlanks ?? []
      const correct = block.correctOrder ?? []
      const blockModes = block.blankInputMode ?? []
      const savedDrops = completedDropValues[idx] ?? {}
      const savedTyped = completedTypedValues[idx] ?? []

      let counter = 0
      for (const line of blanksLines) {
        let out = ''
        let i = 0
        while (i < line.length) {
          const found = line.indexOf(BLANK_TOKEN, i)
          if (found === -1) {
            out += line.slice(i)
            break
          }
          out += line.slice(i, found)
          const m = blockModes[counter] ?? 'wordbank'
          let val = ''
          if (m === 'wordbank') {
            val = savedDrops[`b${counter}`] ?? correct[counter] ?? ''
          } else {
            val = savedTyped[counter] ?? correct[counter] ?? ''
          }
          out += val
          counter += 1
          i = found + BLANK_TOKEN.length
        }
        parts.push(out)
      }
      if (block.codeSuffix) parts.push(block.codeSuffix)
    }

    if (exercise.codePrefix) parts.push(exercise.codePrefix)

    const blanksLines = exercise.codeWithBlanks ?? []
    let counter = 0
    for (const line of blanksLines) {
      const lineEndCounter = counter + countBlanks([line])
      if (counter <= blankIndex && blankIndex < lineEndCounter) {
        break
      }
      let out = ''
      let i = 0
      while (i < line.length) {
        const found = line.indexOf(BLANK_TOKEN, i)
        if (found === -1) {
          out += line.slice(i)
          break
        }
        out += line.slice(i, found)
        const m = modeOf(counter)
        let val = ''
        if (m === 'wordbank') {
          val = dropValues[`b${counter}`] ?? correctOrder[counter] ?? ''
        } else {
          val =
            (typedValues[counter] ?? '').trim() || correctOrder[counter] || ''
        }
        out += val
        counter += 1
        i = found + BLANK_TOKEN.length
      }
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
      const id = `b${i}`
      const m = modeOf(i)
      let pass = false
      let message = ''

      if (m === 'wordbank') {
        pass = dropValues[id] === correctOrder[i]
      } else if (m === 'type') {
        pass =
          (typedValues[i] ?? '').trim() === (correctOrder[i] ?? '').trim()
      } else {
        const studentLine = (typedValues[i] ?? '').trim()
        if (studentLine.length === 0) {
          pass = false
          message = 'Type a line first.'
        } else {
          const eIdx = effectIndexFor(i, blankInputModes)
          const expectedEffect: ExpectedEffect =
            expectedEffects[eIdx] ?? { type: 'noError' }
          const contextCode = buildContextForFreeline(i)
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
          for (let i = 0; i < blankCount; i += 1) {
            const id = `b${i}`
            if (newStates[id] === 'wrong' && modeOf(i) === 'wordbank') {
              delete next[id]
            }
          }
          return next
        })
        setDropTokenIds((prev) => {
          const next = { ...prev }
          for (let i = 0; i < blankCount; i += 1) {
            const id = `b${i}`
            if (newStates[id] === 'wrong' && modeOf(i) === 'wordbank') {
              delete next[id]
            }
          }
          return next
        })
        setTypedValues((prev) => {
          const next = [...prev]
          for (let i = 0; i < blankCount; i += 1) {
            if (newStates[`b${i}`] === 'wrong' && modeOf(i) !== 'wordbank') {
              next[i] = ''
            }
          }
          return next
        })
        setBlankStates((prev) => {
          const next = { ...prev }
          for (let i = 0; i < blankCount; i += 1) {
            const id = `b${i}`
            if (newStates[id] === 'wrong') delete next[id]
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
      [activeIndex]: [...typedValues],
    }))
    onComplete(true)
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

  const renderDropZone = (blankIndex: number, lineIdx?: number) => {
    const id = `b${blankIndex}`
    const filled = dropValues[id]
    const status = blankStates[id]
    const isHover = hoverBlankId === id
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
    return (
      <span
        key={`dz-${blankIndex}`}
        className={cls}
        onDragOver={(e) => {
          e.preventDefault()
          if (hoverBlankId !== id) setHoverBlankId(id)
        }}
        onDragLeave={() => {
          if (hoverBlankId === id) setHoverBlankId(null)
        }}
        onDrop={(e) => {
          e.preventDefault()
          const tokenId = e.dataTransfer.getData('text/plain')
          const tok = tokens.find((t) => t.id === tokenId)
          if (tok) placeToken(id, tok.id, tok.label)
          setHoverBlankId(null)
          setDraggingTokenId(null)
          if (lineIdx !== undefined) handleLineClick(lineIdx, blankIndex)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (lineIdx !== undefined) handleLineClick(lineIdx, blankIndex)
          clearBlank(id)
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

  const renderTypeInput = (blankIndex: number, lineIdx?: number) => {
    const id = `b${blankIndex}`
    const status = blankStates[id]
    const value = typedValues[blankIndex] ?? ''
    let cls = 'fp-type-input'
    if (status === 'correct' || (value && answerState === 'correct')) {
      cls += ' correct'
    } else if (status === 'wrong') {
      cls += ' wrong'
    }
    const sized = Math.max(8, value.length + 2)
    return (
      <input
        key={`ti-${blankIndex}`}
        ref={(el) => {
          typedInputRefs.current[blankIndex] = el
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
        onChange={(e) => setTypedAt(blankIndex, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            let next = -1
            for (let k = blankIndex + 1; k < blankCount; k += 1) {
              if (blankStates[`b${k}`] !== 'correct' && !isBlankFilled(k)) {
                next = k
                break
              }
            }
            if (next !== -1) {
              const target = typedInputRefs.current[next]
              if (target) target.focus()
            }
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onFocus={() => {
          if (lineIdx !== undefined) {
            handleLineClick(lineIdx, blankIndex)
          } else {
            setActiveBankIndex(blankIndex)
          }
        }}
      />
    )
  }

  const renderFreelineInput = (blankIndex: number, lineIdx?: number) => {
    const id = `b${blankIndex}`
    const status = blankStates[id]
    const value = typedValues[blankIndex] ?? ''
    let cls = 'fp-freeline-input'
    if (status === 'correct' || (value && answerState === 'correct')) {
      cls += ' correct'
    } else if (status === 'wrong') {
      cls += ' wrong'
    }
    return (
      <input
        key={`fl-${blankIndex}`}
        ref={(el) => {
          typedInputRefs.current[blankIndex] = el
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
        onChange={(e) => setTypedAt(blankIndex, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (allFilled) handleCheck()
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onFocus={() => {
          if (lineIdx !== undefined) {
            handleLineClick(lineIdx, blankIndex)
          } else {
            setActiveBankIndex(blankIndex)
          }
        }}
      />
    )
  }

  const renderCompletedLineSegments = (
    line: string,
    answers: string[],
    typedAnswers: string[],
    modes: BlankInputMode[],
    startBlankIndex: number,
  ) => {
    const segs: LineSegment[] = []
    let cursor = 0
    let blankIndex = startBlankIndex
    while (cursor < line.length) {
      const found = line.indexOf(BLANK_TOKEN, cursor)
      if (found === -1) {
        segs.push({ kind: 'text', value: line.slice(cursor) })
        break
      }
      if (found > cursor) {
        segs.push({ kind: 'text', value: line.slice(cursor, found) })
      }
      segs.push({ kind: 'blank', index: blankIndex })
      blankIndex += 1
      cursor = found + BLANK_TOKEN.length
    }
    return (
      <>
        {segs.map((seg, i) => {
          if (seg.kind === 'text') {
            return <HighlightedText key={i} value={seg.value} />
          }
          const m = modes[seg.index] ?? 'wordbank'
          const ans =
            m === 'wordbank'
              ? answers[seg.index] ?? ''
              : typedAnswers[seg.index] ?? answers[seg.index] ?? ''
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
    const state: 'done' | 'active' | 'locked' =
      idx < activeIndex ? 'done' : idx === activeIndex ? 'active' : 'locked'
    const cls = `fp-code-block ${
      state === 'done'
        ? 'fp-cb-done'
        : state === 'active'
          ? 'fp-cb-active'
          : 'fp-cb-locked'
    }`
    const blanksLines = block.codeWithBlanks ?? []
    const suffixLines = splitToLines(block.codeSuffix ?? '')
    const answers = block.correctOrder ?? []
    const blockModes = block.blankInputMode ?? []
    const savedValues = completedDropValues[idx]
    const savedTyped = completedTypedValues[idx] ?? []
    const displayAnswers = answers.map(
      (correct, k) => savedValues?.[`b${k}`] ?? correct,
    )

    if (state === 'locked') {
      return (
        <div key={`${block.title}-${idx}`} className={cls}>
          <BlockHeader index={idx} title={block.title} state={state} />
          {blanksLines.map((_line, i) => {
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
    if (state === 'active') {
      let cum = 0
      for (let i = 0; i < blanksLines.length; i += 1) {
        const n = countBlanks([blanksLines[i]])
        if (n > 0 && activeBankIndex >= cum && activeBankIndex < cum + n) {
          activeLineIndex = i
          break
        }
        cum += n
      }
    }

    return (
      <div key={`${block.title}-${idx}`} className={cls}>
        <BlockHeader index={idx} title={block.title} state={state} />
        {blanksLines.map((line, i) => {
          const num = currentLineNumber
          currentLineNumber += 1
          const startBlankCount = blanksLines
            .slice(0, i)
            .reduce((acc, ln) => acc + countBlanks([ln]), 0)
          const blanksOnLine = countBlanks([line])
          const lineBlankIndices = Array.from(
            { length: blanksOnLine },
            (_, k) => startBlankCount + k,
          )
          const freelineIdx = lineBlankIndices.find((bi) => {
            const m = state === 'done' ? blockModes[bi] : modeOf(bi)
            return m === 'freeline'
          })

          if (state === 'done') {
            if (freelineIdx !== undefined) {
              const typedAns = savedTyped[freelineIdx] ?? ''
              return (
                <CodeLine key={`b-${i}`} lineNumber={num}>
                  <HighlightedText value={typedAns} />
                </CodeLine>
              )
            }
            return (
              <CodeLine key={`b-${i}`} lineNumber={num}>
                {renderCompletedLineSegments(
                  line,
                  displayAnswers,
                  savedTyped,
                  blockModes,
                  startBlankCount,
                )}
              </CodeLine>
            )
          }

          const classes: string[] = ['clickable']
          if (i === activeLineIndex) {
            classes.push('fp-active-line')
          } else if (i === selectedLineIndex) {
            classes.push('line-selected')
          }
          const extraClass = classes.join(' ')

          const defaultBlankIdx =
            blanksOnLine === 1 ? lineBlankIndices[0] : null
          const handleClickLine = () => {
            handleLineClick(i, defaultBlankIdx)
          }

          if (freelineIdx !== undefined) {
            return (
              <CodeLine
                key={`b-${i}`}
                lineNumber={num}
                extraClass={extraClass}
                onClick={handleClickLine}
              >
                {renderFreelineInput(freelineIdx, i)}
              </CodeLine>
            )
          }

          const { segments } = parseLineForBlanks(line, startBlankCount)
          return (
            <CodeLine
              key={`b-${i}`}
              lineNumber={num}
              extraClass={extraClass}
              onClick={handleClickLine}
            >
              {segments.map((seg, j) => {
                if (seg.kind === 'text') {
                  return <HighlightedText key={j} value={seg.value} />
                }
                const m = modeOf(seg.index)
                if (m === 'type') return renderTypeInput(seg.index, i)
                return renderDropZone(seg.index, i)
              })}
            </CodeLine>
          )
        })}
        {state === 'active' && activeLineIndex >= 0
          ? (() => {
              const startBlankCount = blanksLines
                .slice(0, activeLineIndex)
                .reduce((acc, ln) => acc + countBlanks([ln]), 0)
              const blanksOnLine = countBlanks([blanksLines[activeLineIndex]])
              const indices = Array.from(
                { length: blanksOnLine },
                (_, k) => startBlankCount + k,
              )
              const hasType = indices.some((bi) => modeOf(bi) === 'type')
              if (!hasType) return null
              return (
                <div className="fp-hint-chips" key="hints">
                  {tokens.map((token) => (
                    <button
                      key={token.id}
                      type="button"
                      className="fp-hint-chip"
                      onClick={() => {
                        const target = indices.find(
                          (bi) =>
                            modeOf(bi) === 'type' &&
                            blankStates[`b${bi}`] !== 'correct',
                        )
                        if (target !== undefined) {
                          setTypedAt(target, token.label)
                          const el = typedInputRefs.current[target]
                          if (el) el.focus()
                        }
                      }}
                    >
                      {token.label}
                    </button>
                  ))}
                </div>
              )
            })()
          : null}
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

  const activeMode = modeOf(activeBankIndex)
  const showTokens = activeMode === 'wordbank'

  return (
    <div className="fp-panel">
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
                <span className="fp-wb-label">
                  {showTokens ? 'Word bank' : 'Type your answer'}
                </span>
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
              {showTokens ? (
                <div className="fp-token-bank">
                  {tokens.map((token) => {
                    const used = usedTokenIds.has(token.id)
                    const dragging = draggingTokenId === token.id
                    let cls = 'fp-token'
                    if (used) cls += ' fp-token-used'
                    if (dragging) cls += ' fp-token-dragging'
                    return (
                      <div
                        key={token.id}
                        className={cls}
                        draggable={!used && !isCorrect}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', token.id)
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggingTokenId(token.id)
                        }}
                        onDragEnd={() => setDraggingTokenId(null)}
                      >
                        {token.label}
                      </div>
                    )
                  })}
                </div>
              ) : null}
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
        <>
          <div className="fp-file-banner">
            This file is pre-written. You can edit it if you want to experiment.
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <textarea
              className="fp-file-editor"
              value={activeFile === 'html' ? editedHtml : editedCss}
              onChange={(e) => {
                if (activeFile === 'html') setEditedHtml(e.target.value)
                else setEditedCss(e.target.value)
              }}
              spellCheck={false}
            />
          </div>
        </>
      )}
    </div>
  )
}
