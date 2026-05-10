'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PanelProps } from './index'
import { runChecksSilently } from '@/lib/runChecks'

type AnswerState = 'idle' | 'checking' | 'correct' | 'wrong'
type LineState = 'idle' | 'correct' | 'wrong'

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

type SortableLineProps = {
  id: string
  code: string
  state: LineState
}

function SortableLine({ id, code, state }: SortableLineProps) {
  const locked = state === 'correct'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: locked })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    pointerEvents: locked ? 'none' : undefined,
  }

  const classes = ['dr-line']
  if (isDragging) classes.push('dragging')
  if (state === 'correct') classes.push('correct')
  else if (state === 'wrong') classes.push('wrong')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes.join(' ')}
      {...attributes}
      {...listeners}
    >
      <span className="dr-handle" aria-hidden>⠿</span>
      <span>{code}</span>
    </div>
  )
}

export function DragReorderPanel({ exercise, onComplete }: PanelProps) {
  const codeLines = useMemo(() => exercise.codeLines ?? [], [exercise])
  const checks = exercise.checks ?? []

  const lineMap = useMemo(() => {
    const map: Record<string, string> = {}
    codeLines.forEach((line, idx) => {
      map[`line-${idx}`] = line
    })
    return map
  }, [codeLines])

  const correctOrder = useMemo(() => codeLines.map((_, idx) => `line-${idx}`), [codeLines])

  const [items, setItems] = useState<string[]>(() => shuffle(correctOrder))
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [lineStates, setLineStates] = useState<Record<string, LineState>>(() => {
    const init: Record<string, LineState> = {}
    correctOrder.forEach((id) => {
      init[id] = 'idle'
    })
    return init
  })
  const [errorMessage, setErrorMessage] = useState('')

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkRef = useRef<() => void>(() => {})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    setItems(shuffle(correctOrder))
    const init: Record<string, LineState> = {}
    correctOrder.forEach((id) => {
      init[id] = 'idle'
    })
    setLineStates(init)
    setAnswerState('idle')
    setErrorMessage('')
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [exercise, correctOrder])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setItems((prev) => {
      const oldIndex = prev.indexOf(String(active.id))
      const newIndex = prev.indexOf(String(over.id))
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const handleCheck = async () => {
    if (answerState === 'checking') return
    setAnswerState('checking')
    setErrorMessage('')
    const assembled = items.map((id) => lineMap[id]).join('\n')
    try {
      const results = await runChecksSilently(assembled, checks, 5000)
      const allPassed =
        results.length === checks.length && results.every((r) => r.passed)
      if (allPassed) {
        const next: Record<string, LineState> = {}
        items.forEach((id) => {
          next[id] = 'correct'
        })
        setLineStates(next)
        setAnswerState('correct')
      } else {
        const nextStates: Record<string, LineState> = {}
        items.forEach((id, idx) => {
          if (id === correctOrder[idx]) nextStates[id] = 'correct'
          else nextStates[id] = 'wrong'
        })
        setLineStates(nextStates)
        setAnswerState('wrong')
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
        resetTimerRef.current = setTimeout(() => {
          setItems((prev) => {
            const wrongIds = prev.filter((id) => nextStates[id] === 'wrong')
            const reshuffled = shuffle(wrongIds)
            let wrongCursor = 0
            return prev.map((id) =>
              nextStates[id] === 'correct' ? id : reshuffled[wrongCursor++],
            )
          })
          setLineStates((prev) => {
            const next = { ...prev }
            Object.keys(next).forEach((id) => {
              if (next[id] === 'wrong') next[id] = 'idle'
            })
            return next
          })
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

  return (
    <div className="panel-container">
      <h2 className="panel-heading">{exercise.title}</h2>
      <p className="panel-instruction">{exercise.tasks[0] ?? ''}</p>
      <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: -12, marginBottom: 16 }}>
        Drag the lines into the correct order.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="dr-list">
            {items.map((id) => (
              <SortableLine
                key={id}
                id={id}
                code={lineMap[id] ?? ''}
                state={lineStates[id] ?? 'idle'}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {answerState !== 'correct' ? (
        <button
          type="button"
          className="panel-check-btn"
          onClick={handleCheck}
          disabled={answerState === 'checking'}
        >
          {answerState === 'checking' ? 'Checking...' : 'Check Answer'}
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">
          Not quite — some lines are out of order
        </div>
      ) : null}

      {errorMessage ? (
        <div className="panel-feedback wrong">{errorMessage}</div>
      ) : null}

      {answerState === 'correct' ? (
        <>
          <div className="panel-feedback correct">✓ Perfect order!</div>
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
