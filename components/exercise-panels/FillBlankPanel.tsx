'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDevice } from '@/context/DeviceContext'
import type { Exercise } from '@/lib/lessons'
import { useWordBankFiller, type WordBankFiller } from '@/lib/useWordBankFiller'

type FillBlankPanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
  onCorrect?: () => void
  isAlreadyCompleted?: boolean
}

type AnswerState = 'idle' | 'correct' | 'wrong'

type DragSource =
  | { kind: 'token'; tokenId: string; label: string }
  | { kind: 'blank'; blankIndex: number; tokenId: string; label: string }
  | null

const BLANK_TOKEN = '___BLANK___'

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'blank'; index: number }

function parseLine(line: string, startIndex: number): { segments: Segment[]; nextIndex: number } {
  const segments: Segment[] = []
  let cursor = 0
  let blankIndex = startIndex
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
  return { segments, nextIndex: blankIndex }
}

export function FillBlankPanel({
  exercise,
  onComplete,
  onCorrect,
  isAlreadyCompleted = false,
}: FillBlankPanelProps) {
  const lines = exercise.codeWithBlanks ?? []
  const tokens = exercise.tokenBank ?? []
  const correctOrder = exercise.correctOrder ?? []

  const parsedLines = useMemo(() => {
    const result: Segment[][] = []
    let next = 0
    for (const line of lines) {
      const { segments, nextIndex } = parseLine(line, next)
      result.push(segments)
      next = nextIndex
    }
    return result
  }, [lines])

  const blankCount = correctOrder.length

  const filler = useWordBankFiller(lines, correctOrder, tokens)
  const { filled, filledTokenIds, allFilled, reset } = filler

  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongFlags, setWrongFlags] = useState<boolean[]>(() => Array(blankCount).fill(false))
  const [draggingSource, setDraggingSource] = useState<DragSource>(null)
  const [hoverBlankIndex, setHoverBlankIndex] = useState<number | null>(null)
  const [hoverBank, setHoverBank] = useState(false)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const device = useDevice()

  useEffect(() => {
    reset()
    setAnswerState('idle')
    setWrongFlags(Array(blankCount).fill(false))
    setDraggingSource(null)
    setHoverBlankIndex(null)
    setHoverBank(false)
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise, blankCount])

  useEffect(() => {
    if (!isAlreadyCompleted) return
    const fills: (string | null)[] = new Array(blankCount).fill(null)
    const ids: (string | null)[] = new Array(blankCount).fill(null)
    for (let i = 0; i < blankCount; i += 1) {
      const expected = correctOrder[i]
      // correctOrder stores labels, not ids — match against token.label.
      const tok = tokens.find((t) => t.label === expected)
      fills[i] = expected
      ids[i] = tok ? tok.id : `restored-${i}`
    }
    filler.setAll(fills, ids)
    setAnswerState('correct')
    setWrongFlags(Array(blankCount).fill(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAlreadyCompleted, exercise, blankCount])

  const placedLabels = useMemo(() => {
    if (answerState !== 'correct') return new Set<string>()
    const set = new Set<string>()
    for (const v of filled) {
      if (v !== null) set.add(v)
    }
    return set
  }, [answerState, filled])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const clearWrongState = () => {
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setWrongFlags(Array(blankCount).fill(false))
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }
  }

  const handleTokenClick = (tokenId: string, label: string) => {
    if (answerState === 'correct') return
    filler.handleTokenClick(tokenId, label)
    clearWrongState()
  }

  const handleBlankClick = (index: number) => {
    if (answerState === 'correct') return
    if (filled[index] === null) return
    filler.handleBlankClick(index)
    clearWrongState()
  }

  const handleCheck = () => {
    if (!allFilled) return
    const wrong = filled.map((value, i) => value !== correctOrder[i])
    if (wrong.every((w) => !w)) {
      setAnswerState('correct')
      setWrongFlags(Array(blankCount).fill(false))
      onCorrect?.()
    } else {
      setAnswerState('wrong')
      setWrongFlags(wrong)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        for (let i = 0; i < wrong.length; i += 1) {
          if (wrong[i]) filler.handleBlankClick(i)
        }
        setWrongFlags(Array(blankCount).fill(false))
        setAnswerState('idle')
        resetTimerRef.current = null
      }, 1200)
    }
  }

  const handleBlankDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setHoverBlankIndex(null)
    setDraggingSource(null)
    if (answerState === 'correct') return
    const raw = e.dataTransfer.getData('text/plain')
    if (!raw) return
    let source: DragSource
    try {
      source = JSON.parse(raw) as DragSource
    } catch {
      return
    }
    if (!source) return
    if (source.kind === 'token') {
      filler.placeAt(index, source.tokenId, source.label)
    } else if (source.kind === 'blank') {
      if (source.blankIndex === index) return
      filler.placeAt(index, source.tokenId, source.label)
      filler.clearBlank(source.blankIndex)
    }
    clearWrongState()
  }

  const handleBankDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setHoverBank(false)
    setDraggingSource(null)
    if (answerState === 'correct') return
    const raw = e.dataTransfer.getData('text/plain')
    if (!raw) return
    let source: DragSource
    try {
      source = JSON.parse(raw) as DragSource
    } catch {
      return
    }
    if (source && source.kind === 'blank') {
      filler.clearBlank(source.blankIndex)
    }
    clearWrongState()
  }

  const blankClass = (index: number) => {
    const classes = ['fb-blank']
    if (answerState === 'correct') {
      if (filled[index] !== null) classes.push('filled', 'correct')
    } else if (answerState === 'wrong') {
      if (wrongFlags[index]) classes.push('filled', 'wrong')
      else if (filled[index] !== null) classes.push('filled', 'correct')
    } else if (filled[index] !== null) {
      if (filled[index] === correctOrder[index]) classes.push('filled', 'correct')
      else classes.push('filled')
    }
    if (hoverBlankIndex === index) classes.push('drag-over')
    return classes.join(' ')
  }

  if (device === 'tablet') {
    return (
      <FillBlankTablet
        exercise={exercise}
        parsedLines={parsedLines}
        filler={filler}
        answerState={answerState}
        wrongFlags={wrongFlags}
        placedLabels={placedLabels}
        onTokenClick={handleTokenClick}
        onBlankClick={handleBlankClick}
        onCheck={handleCheck}
        clearWrongState={clearWrongState}
        onComplete={onComplete}
      />
    )
  }

  return (
    <div className="panel-container">
      <div className={`fb-code-block${exercise.compactBlanks ? ' fb-compact' : ''}`}>
        {parsedLines.map((segments, lineIdx) => (
          <div key={lineIdx}>
            {segments.map((segment, segIdx) => {
              if (segment.kind === 'text') {
                return <Fragment key={segIdx}>{segment.value}</Fragment>
              }
              const value = filled[segment.index]
              const tokenId = filledTokenIds[segment.index]
              return (
                <span
                  key={segIdx}
                  className={blankClass(segment.index)}
                  onClick={() => handleBlankClick(segment.index)}
                  role="button"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setHoverBlankIndex(segment.index)
                  }}
                  onDragLeave={() => {
                    setHoverBlankIndex((prev) =>
                      prev === segment.index ? null : prev,
                    )
                  }}
                  onDrop={(e) => handleBlankDrop(e, segment.index)}
                >
                  {value !== null && tokenId !== null ? (
                    <span
                      className="fb-filled-chip"
                      draggable={answerState !== 'correct'}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'text/plain',
                          JSON.stringify({
                            kind: 'blank',
                            blankIndex: segment.index,
                            tokenId,
                            label: value,
                          }),
                        )
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingSource({
                          kind: 'blank',
                          blankIndex: segment.index,
                          tokenId,
                          label: value,
                        })
                      }}
                      onDragEnd={() => setDraggingSource(null)}
                    >
                      {value}
                    </span>
                  ) : (
                    ''
                  )}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="fb-token-label">Token bank</div>
      <div
        className={`fb-token-bank${hoverBank ? ' drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setHoverBank(true)
        }}
        onDragLeave={() => setHoverBank(false)}
        onDrop={handleBankDrop}
      >
        {tokens.map((token) => {
          const isDragging =
            draggingSource?.kind === 'token' &&
            draggingSource.tokenId === token.id
          const isUsed = placedLabels.has(token.label)
          return (
            <div
              key={token.id}
              role="button"
              tabIndex={0}
              className={`fb-token${isDragging ? ' dragging' : ''}${isUsed ? ' used' : ''}`}
              onClick={() => handleTokenClick(token.id, token.label)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  handleTokenClick(token.id, token.label)
                }
              }}
              draggable={answerState !== 'correct'}
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'text/plain',
                  JSON.stringify({
                    kind: 'token',
                    tokenId: token.id,
                    label: token.label,
                  }),
                )
                e.dataTransfer.effectAllowed = 'move'
                setDraggingSource({
                  kind: 'token',
                  tokenId: token.id,
                  label: token.label,
                })
              }}
              onDragEnd={() => setDraggingSource(null)}
            >
              {token.label}
            </div>
          )
        })}
      </div>

      {answerState !== 'correct' && allFilled ? (
        <button
          type="button"
          className="panel-check-btn"
          onClick={handleCheck}
        >
          Check answer
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">Not quite, try again</div>
      ) : null}

      {answerState === 'correct' ? (
        <>
          <div className="panel-feedback correct">✓ Correct!</div>
          {exercise.explanation ? (
            <div className="panel-explanation">{exercise.explanation}</div>
          ) : null}
          <button
            type="button"
            className="panel-next-btn"
            onClick={() => onComplete(true)}
          >
            Next
          </button>
        </>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tablet drag layer — dnd-kit variant. Mirrors the desktop HTML5 interactions
// in FillBlankPanel above. Used when device === 'tablet'.
// ---------------------------------------------------------------------------

type DragData =
  | { kind: 'token'; tokenId: string; label: string }
  | { kind: 'blank'; blankIndex: number; tokenId: string; label: string }

const DROP_BLANK_PREFIX = 'fb-blank:'
const DROP_BANK_ID = 'fb-bank'

type DraggableTokenProps = {
  token: { id: string; label: string }
  disabled: boolean
  isActive: boolean
  isUsed: boolean
  onClick: () => void
}

function DraggableToken({ token, disabled, isActive, isUsed, onClick }: DraggableTokenProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `fb-token:${token.id}`,
    data: { kind: 'token', tokenId: token.id, label: token.label } satisfies DragData,
    disabled,
  })
  const cls = `fb-token${isActive ? ' dragging' : ''}${isUsed ? ' used' : ''}`
  return (
    <div
      ref={setNodeRef}
      className={cls}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
      {...listeners}
      {...attributes}
    >
      {token.label}
    </div>
  )
}

type DraggableChipProps = {
  blankIndex: number
  tokenId: string
  label: string
  disabled: boolean
  isActive: boolean
}

function DraggableChip({
  blankIndex,
  tokenId,
  label,
  disabled,
  isActive,
}: DraggableChipProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `fb-chip:${blankIndex}`,
    data: {
      kind: 'blank',
      blankIndex,
      tokenId,
      label,
    } satisfies DragData,
    disabled,
  })
  const cls = `fb-filled-chip${isActive ? ' dragging' : ''}`
  return (
    <span ref={setNodeRef} className={cls} {...listeners} {...attributes}>
      {label}
    </span>
  )
}

type DroppableBlankProps = {
  index: number
  baseClassName: string
  onClick: () => void
  children: React.ReactNode
}

function DroppableBlank({
  index,
  baseClassName,
  onClick,
  children,
}: DroppableBlankProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${DROP_BLANK_PREFIX}${index}`,
  })
  const cls = isOver ? `${baseClassName} drag-over` : baseClassName
  return (
    <span ref={setNodeRef} className={cls} onClick={onClick} role="button">
      {children}
    </span>
  )
}

type DroppableBankProps = {
  children: React.ReactNode
}

function DroppableBank({ children }: DroppableBankProps) {
  const { isOver, setNodeRef } = useDroppable({ id: DROP_BANK_ID })
  const cls = `fb-token-bank${isOver ? ' drag-over' : ''}`
  return (
    <div ref={setNodeRef} className={cls}>
      {children}
    </div>
  )
}

type FillBlankTabletProps = {
  exercise: Exercise
  parsedLines: Segment[][]
  filler: WordBankFiller
  answerState: AnswerState
  wrongFlags: boolean[]
  placedLabels: Set<string>
  onTokenClick: (tokenId: string, label: string) => void
  onBlankClick: (index: number) => void
  onCheck: () => void
  clearWrongState: () => void
  onComplete: (correct: boolean) => void
}

export function FillBlankTablet({
  exercise,
  parsedLines,
  filler,
  answerState,
  wrongFlags,
  placedLabels,
  onTokenClick,
  onBlankClick,
  onCheck,
  clearWrongState,
  onComplete,
}: FillBlankTabletProps) {
  const tokens = exercise.tokenBank ?? []
  const correctOrder = exercise.correctOrder ?? []
  const { filled, filledTokenIds, allFilled, placeAt, clearBlank } = filler

  const [activeDrag, setActiveDrag] = useState<DragData | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragData | undefined
    setActiveDrag(data ?? null)
  }

  const handleDragCancel = () => setActiveDrag(null)

  const handleDragEnd = (event: DragEndEvent) => {
    const data = event.active.data.current as DragData | undefined
    const overId = event.over ? String(event.over.id) : null
    setActiveDrag(null)
    if (!data) return
    if (answerState === 'correct') return
    if (overId === null) return

    if (overId.startsWith(DROP_BLANK_PREFIX)) {
      const targetIndex = Number(overId.slice(DROP_BLANK_PREFIX.length))
      if (Number.isNaN(targetIndex)) return
      if (data.kind === 'token') {
        placeAt(targetIndex, data.tokenId, data.label)
        clearWrongState()
      } else if (data.kind === 'blank') {
        if (data.blankIndex === targetIndex) return
        placeAt(targetIndex, data.tokenId, data.label)
        clearBlank(data.blankIndex)
        clearWrongState()
      }
      return
    }

    if (overId === DROP_BANK_ID) {
      if (data.kind === 'blank') {
        clearBlank(data.blankIndex)
        clearWrongState()
      }
    }
  }

  // Same as desktop's blankClass minus the `drag-over` flag — dnd-kit's
  // useDroppable.isOver supplies that piece in DroppableBlank.
  const baseBlankClass = (index: number) => {
    const classes = ['fb-blank']
    if (answerState === 'correct') {
      if (filled[index] !== null) classes.push('filled', 'correct')
    } else if (answerState === 'wrong') {
      if (wrongFlags[index]) classes.push('filled', 'wrong')
      else if (filled[index] !== null) classes.push('filled', 'correct')
    } else if (filled[index] !== null) {
      if (filled[index] === correctOrder[index]) classes.push('filled', 'correct')
      else classes.push('filled')
    }
    return classes.join(' ')
  }

  return (
    <div className="panel-container">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`fb-code-block${exercise.compactBlanks ? ' fb-compact' : ''}`}>
          {parsedLines.map((segments, lineIdx) => (
            <div key={lineIdx}>
              {segments.map((segment, segIdx) => {
                if (segment.kind === 'text') {
                  return <Fragment key={segIdx}>{segment.value}</Fragment>
                }
                const value = filled[segment.index]
                const tokenId = filledTokenIds[segment.index]
                const chipActive =
                  activeDrag?.kind === 'blank' &&
                  activeDrag.blankIndex === segment.index
                return (
                  <DroppableBlank
                    key={segIdx}
                    index={segment.index}
                    baseClassName={baseBlankClass(segment.index)}
                    onClick={() => onBlankClick(segment.index)}
                  >
                    {value !== null && tokenId !== null ? (
                      <DraggableChip
                        blankIndex={segment.index}
                        tokenId={tokenId}
                        label={value}
                        disabled={answerState === 'correct'}
                        isActive={chipActive}
                      />
                    ) : (
                      ''
                    )}
                  </DroppableBlank>
                )
              })}
            </div>
          ))}
        </div>

        <div className="fb-token-label">Token bank</div>
        <DroppableBank>
          {tokens.map((token) => {
            const tokenActive =
              activeDrag?.kind === 'token' && activeDrag.tokenId === token.id
            return (
              <DraggableToken
                key={token.id}
                token={token}
                disabled={answerState === 'correct'}
                isActive={tokenActive}
                isUsed={placedLabels.has(token.label)}
                onClick={() => onTokenClick(token.id, token.label)}
              />
            )
          })}
        </DroppableBank>

        <DragOverlay>
          {activeDrag ? (
            activeDrag.kind === 'token' ? (
              <div className="fb-token">{activeDrag.label}</div>
            ) : (
              <span className="fb-filled-chip">{activeDrag.label}</span>
            )
          ) : null}
        </DragOverlay>
      </DndContext>

      {answerState !== 'correct' && allFilled ? (
        <button type="button" className="panel-check-btn" onClick={onCheck}>
          Check answer
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">Not quite, try again</div>
      ) : null}

      {answerState === 'correct' ? (
        <>
          <div className="panel-feedback correct">✓ Correct!</div>
          {exercise.explanation ? (
            <div className="panel-explanation">{exercise.explanation}</div>
          ) : null}
          <button
            type="button"
            className="panel-next-btn"
            onClick={() => onComplete(true)}
          >
            Next
          </button>
        </>
      ) : null}
    </div>
  )
}
