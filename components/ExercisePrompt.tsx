'use client'

import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '@/lib/lessons'

type ExercisePromptProps = {
  exercises: Exercise[]
  activeIndex: number
  hintVisible: boolean
  isFading?: boolean
  currentStepIndex?: number
  completedSteps?: Set<number>
}

function taskState(
  i: number,
  currentStepIndex?: number,
  completedSteps?: Set<number>,
): '' | 'active' | 'done' | 'upcoming' {
  if (currentStepIndex === undefined) return ''
  if (completedSteps?.has(i)) return 'done'
  if (i === currentStepIndex) return 'active'
  return 'upcoming'
}

const TYPE_TOOLTIPS: Record<Exercise['type'], string> = {
  practice: 'Write code to solve the problem',
  predict: 'Predict the output before running',
  debug: 'Find and fix the bug in the starter code',
  apply: 'Apply what you learned to the game project',
  independent: 'Build this from scratch — no guidance',
  challenge: 'Extension for when you finish early',
}

export function ExercisePrompt({
  exercises,
  activeIndex,
  hintVisible,
  isFading = false,
  currentStepIndex,
  completedSteps,
}: ExercisePromptProps) {
  const exercise = exercises[activeIndex]
  const scrollRef = useRef<HTMLElement | null>(null)
  const [showFade, setShowFade] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [activeIndex])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => {
      const scrollable = el.scrollHeight > el.clientHeight + 1
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      setShowFade(scrollable && !atBottom)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener('scroll', update)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [activeIndex, hintVisible])

  if (!exercise) {
    return (
      <section className="exercise-prompt">
        <div className="empty-state-block">No exercises for this lesson.</div>
      </section>
    )
  }

  const { type, title, duration, tasks, hint } = exercise
  const total = exercises.length

  return (
    <section
      className={`exercise-prompt${isFading ? ' fading' : ''}`}
      ref={scrollRef}
    >
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--text3)',
          padding: '10px 0 25px',
        }}
      >
        Exercise {activeIndex + 1} of {total}
      </div>

      <div className="prompt-header">
        <span
          className={`type-badge type-${type}`}
          title={TYPE_TOOLTIPS[type]}
        >
          {type}
        </span>
        <h2 className="prompt-title">{title}</h2>
        <span className="prompt-duration">{duration}</span>
      </div>

      <ol className="task-list">
        {tasks.map((task, i) => {
          const state = taskState(i, currentStepIndex, completedSteps)
          const className = state ? `task-item ${state}` : 'task-item'
          return (
            <li className={className} key={i}>
              <span className="task-step">{String(i + 1).padStart(2, '0')}</span>
              <span>{task}</span>
            </li>
          )
        })}
      </ol>

      {hint ? (
        <div className={`hint-row${hintVisible ? ' visible' : ''}`}>
          <span className="hint-label">Hint:</span>
          <span>{hint}</span>
        </div>
      ) : null}

      {showFade ? <div className="prompt-fade" aria-hidden /> : null}
    </section>
  )
}
