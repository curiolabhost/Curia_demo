'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { PanelProps } from './index'
import { runChecksSilently } from '@/lib/runChecks'
import { useTypedFiller } from '@/lib/useTypedFiller'

type AnswerState = 'idle' | 'checking' | 'correct' | 'wrong'
type BlankState = 'idle' | 'correct' | 'wrong'

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
  if (segments.length === 0) {
    segments.push({ kind: 'text', value: '' })
  }
  return { segments, nextIndex: blankIndex }
}

export function FillBlankTypedPanel({ exercise, onComplete }: PanelProps) {
  const lines = exercise.codeWithBlanks ?? []
  const placeholders = exercise.blankPlaceholders ?? []
  const widths = exercise.blankWidths ?? []
  const checks = exercise.checks ?? []

  const parsed = useMemo(() => {
    const result: Segment[][] = []
    let next = 0
    for (const line of lines) {
      const { segments, nextIndex } = parseLine(line, next)
      result.push(segments)
      next = nextIndex
    }
    return { lines: result, total: next }
  }, [lines])

  const blankCount = parsed.total

  const filler = useTypedFiller(lines, placeholders, widths)
  const {
    values,
    setValueAt,
    registerInputRef,
    focusBlank,
    allFilled,
    reset: resetFiller,
  } = filler

  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [blankStates, setBlankStates] = useState<BlankState[]>(() =>
    Array(blankCount).fill('idle'),
  )
  const [errorMessage, setErrorMessage] = useState('')

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkRef = useRef<() => void>(() => {})

  useEffect(() => {
    resetFiller()
    setBlankStates(Array(blankCount).fill('idle'))
    setAnswerState('idle')
    setErrorMessage('')
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

  const handleCheck = async () => {
    if (answerState === 'checking') return
    if (!allFilled) return
    setAnswerState('checking')
    setErrorMessage('')

    let cursor = 0
    const assembledLines = lines.map((line) => {
      let out = ''
      let i = 0
      while (i < line.length) {
        const found = line.indexOf(BLANK_TOKEN, i)
        if (found === -1) {
          out += line.slice(i)
          break
        }
        out += line.slice(i, found)
        out += values[cursor] ?? ''
        cursor += 1
        i = found + BLANK_TOKEN.length
      }
      return out
    })
    const assembled = assembledLines.join('\n')

    try {
      const results = await runChecksSilently(assembled, checks, 5000)
      const allPassed = results.length === checks.length && results.every((r) => r.passed)
      if (allPassed) {
        setBlankStates(Array(blankCount).fill('correct'))
        setAnswerState('correct')
      } else {
        const nextStates: BlankState[] = values.map(() => 'wrong')
        setBlankStates(nextStates)
        setAnswerState('wrong')
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        resetTimerRef.current = setTimeout(() => {
          for (let i = 0; i < nextStates.length; i += 1) {
            if (nextStates[i] !== 'correct') {
              setValueAt(i, '')
            }
          }
          setBlankStates((prev) => prev.map((s) => (s === 'correct' ? 'correct' : 'idle')))
          setAnswerState('idle')
          resetTimerRef.current = null
        }, 1200)
      }
    } catch {
      setAnswerState('idle')
      setErrorMessage('Something went wrong — try again')
    }
  }

  checkRef.current = handleCheck

  useEffect(() => {
    const onPanelCheck = () => {
      checkRef.current()
    }
    document.addEventListener('panel:check-answer', onPanelCheck)
    return () => document.removeEventListener('panel:check-answer', onPanelCheck)
  }, [])

  const handleChange = (index: number, value: string) => {
    if (blankStates[index] === 'correct') return
    setValueAt(index, value)
    if (blankStates[index] === 'wrong') {
      setBlankStates((prev) => {
        const next = [...prev]
        next[index] = 'idle'
        return next
      })
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    let next = -1
    for (let i = index + 1; i < blankCount; i++) {
      if (blankStates[i] !== 'correct' && (values[i] ?? '').trim().length === 0) {
        next = i
        break
      }
    }
    if (next === -1) {
      for (let i = 0; i < index; i++) {
        if (blankStates[i] !== 'correct' && (values[i] ?? '').trim().length === 0) {
          next = i
          break
        }
      }
    }
    if (next !== -1) {
      focusBlank(next)
    } else if (allFilled) {
      handleCheck()
    }
  }

  const inputClass = (index: number) => {
    const classes = ['fbt-input']
    if (blankStates[index] === 'correct') classes.push('correct')
    else if (blankStates[index] === 'wrong') classes.push('wrong')
    else if ((values[index] ?? '').length > 0) classes.push('filled')
    return classes.join(' ')
  }

  return (
    <div className="panel-container">
      <h2 className="panel-heading">{exercise.title}</h2>
      <p className="panel-instruction">{exercise.tasks[0] ?? ''}</p>

      <div className="fbt-code-block">
        {parsed.lines.map((segments, lineIdx) => (
          <div key={lineIdx}>
            {segments.map((segment, segIdx) => {
              if (segment.kind === 'text') {
                return <Fragment key={segIdx}>{segment.value}</Fragment>
              }
              const i = segment.index
              return (
                <input
                  key={segIdx}
                  ref={(el) => registerInputRef(i, el)}
                  className={inputClass(i)}
                  type="text"
                  value={values[i] ?? ''}
                  placeholder={placeholders[i] ?? '...'}
                  size={widths[i] ?? 8}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={answerState === 'checking' || blankStates[i] === 'correct'}
                />
              )
            })}
          </div>
        ))}
      </div>

      {answerState !== 'correct' ? (
        <button
          type="button"
          className="panel-check-btn"
          onClick={handleCheck}
          disabled={answerState === 'checking' || !allFilled}
        >
          {answerState === 'checking' ? 'Checking...' : 'Check Answer'}
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">
          Not quite — check the highlighted blanks
        </div>
      ) : null}

      {errorMessage ? (
        <div className="panel-feedback wrong">{errorMessage}</div>
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
