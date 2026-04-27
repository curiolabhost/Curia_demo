'use client'

import { useEffect, useRef, useState } from 'react'
import type { Exercise } from '@/lib/lessons'

type ExercisePromptProps = {
  exercises: Exercise[]
  activeIndex: number
  onNavigate: (index: number) => void
  hintVisible: boolean
  isFading?: boolean
  shortcutPrev?: string
  shortcutNext?: string
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
  onNavigate,
  hintVisible,
  isFading = false,
  shortcutPrev,
  shortcutNext,
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
  const isFirst = activeIndex === 0
  const isLast = activeIndex === total - 1

  return (
    <section
      className={`exercise-prompt${isFading ? ' fading' : ''}`}
      ref={scrollRef}
    >
      <div className="exercise-nav">
        <span className="exercise-counter">
          Exercise {activeIndex + 1} of {total}
        </span>
        <div className="exercise-nav-buttons">
          <div className="exercise-nav-button-cell">
            <button
              type="button"
              className="exercise-nav-button"
              onClick={() => onNavigate(activeIndex - 1)}
              disabled={isFirst}
              aria-label="Previous exercise"
              title={shortcutPrev ? `Previous (${shortcutPrev})` : 'Previous exercise'}
            >
              {'←'}
            </button>
            {shortcutPrev ? (
              <span className="exercise-nav-kbd">{shortcutPrev}</span>
            ) : null}
          </div>
          <div className="exercise-nav-button-cell">
            <button
              type="button"
              className="exercise-nav-button"
              onClick={() => onNavigate(activeIndex + 1)}
              disabled={isLast}
              aria-label="Next exercise"
              title={shortcutNext ? `Next (${shortcutNext})` : 'Next exercise'}
            >
              {'→'}
            </button>
            {shortcutNext ? (
              <span className="exercise-nav-kbd">{shortcutNext}</span>
            ) : null}
          </div>
        </div>
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
        {tasks.map((task, i) => (
          <li className="task-item" key={i}>
            <span className="task-step">{String(i + 1).padStart(2, '0')}</span>
            <span>{task}</span>
          </li>
        ))}
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
