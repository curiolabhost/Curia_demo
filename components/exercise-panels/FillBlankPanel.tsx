'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '@/lib/lessons'
import { useWordBankFiller } from '@/lib/useWordBankFiller'

type FillBlankPanelProps = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
}

type AnswerState = 'idle' | 'correct' | 'wrong'

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
  const { filled, usedTokenIds, allFilled, reset } = filler

  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [wrongFlags, setWrongFlags] = useState<boolean[]>(() => Array(blankCount).fill(false))
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    reset()
    setAnswerState('idle')
    setWrongFlags(Array(blankCount).fill(false))
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

  const handleTokenClick = (tokenId: string, label: string) => {
    if (answerState === 'correct') return
    filler.handleTokenClick(tokenId, label)
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setWrongFlags(Array(blankCount).fill(false))
    }
  }

  const isCorrectLocked = (index: number) =>
    answerState === 'idle' &&
    filled[index] !== null &&
    filled[index] === correctOrder[index]

  const handleBlankClick = (index: number) => {
    if (answerState === 'correct') return
    if (filled[index] === null) return
    if (isCorrectLocked(index)) return
    filler.handleBlankClick(index)
    if (answerState === 'wrong') {
      setAnswerState('idle')
      setWrongFlags(Array(blankCount).fill(false))
    }
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
              return (
                <span
                  key={segIdx}
                  className={blankClass(segment.index)}
                  onClick={() => handleBlankClick(segment.index)}
                  role="button"
                >
                  {value ?? ''}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="fb-token-label">Token bank</div>
      <div className="fb-token-bank">
        {tokens.map((token) => {
          const used = usedTokenIds.has(token.id)
          return (
            <button
              key={token.id}
              type="button"
              className={`fb-token${used ? ' used' : ''}`}
              onClick={() => handleTokenClick(token.id, token.label)}
            >
              {token.label}
            </button>
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
        <div className="panel-feedback wrong">Not quite — try again</div>
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
