'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '@/lib/lessons'
import { useWordBankFiller } from '@/lib/useWordBankFiller'

type FillBlankPanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
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

export function FillBlankPanel({ exercise, onComplete }: FillBlankPanelProps) {
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

  return (
    <div className="panel-container">
      <h2 className="panel-heading">{exercise.title}</h2>
      <p className="panel-instruction">{exercise.tasks[0] ?? ''}</p>

      <div className="fb-code-block">
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
          return (
            <div
              key={token.id}
              role="button"
              tabIndex={0}
              className={`fb-token${isDragging ? ' dragging' : ''}`}
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
