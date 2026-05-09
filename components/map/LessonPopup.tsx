'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'

type LessonPopupProps = {
  lesson: Lesson
  onClose: () => void
  onOpenLesson: (lessonId: string) => void
  onSelectExercise?: (lessonId: string, exerciseIndex: number) => void
  onSelectChallenge?: (lessonId: string, challengeIndex: number) => void
}

export function LessonPopup({
  lesson,
  onClose,
  onOpenLesson,
  onSelectExercise,
  onSelectChallenge,
}: LessonPopupProps) {
  const [isClosing, setIsClosing] = useState(false)
  const lastLessonIdRef = useRef(lesson.id)

  useEffect(() => {
    if (lesson.id !== lastLessonIdRef.current) {
      lastLessonIdRef.current = lesson.id
      setIsClosing(false)
    }
  }, [lesson.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsClosing(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLElement>) => {
    if (isClosing && e.animationName === 'lesson-panel-slide-out') {
      onClose()
    }
  }

  const description = lesson.description ?? null
  const exercises = lesson.exercises ?? []
  const challenges = lesson.challenges ?? []
  const hasExercises = exercises.length > 0
  const hasChallenges = challenges.length > 0

  return (
    <aside
      className={`lesson-panel${isClosing ? ' closing' : ''}`}
      aria-labelledby="lesson-panel-title"
      onAnimationEnd={handleAnimationEnd}
    >
      <button
        type="button"
        className="lesson-panel-close"
        onClick={() => setIsClosing(true)}
        aria-label="Close lesson preview"
      >
        ×
      </button>

      <div className="lesson-panel-scroll">
        <h2 id="lesson-panel-title" className="lesson-panel-title">
          {lesson.title}
        </h2>

        {description ? (
          <p className="lesson-panel-desc">{description}</p>
        ) : null}

        {hasExercises ? (
          <>
            <div className="lesson-panel-section-header">Exercises</div>
            <ul className="lesson-panel-list">
              {exercises.map((ex, idx) => (
                <li key={`ex-${idx}`}>
                  <button
                    type="button"
                    className="lesson-panel-row"
                    onClick={
                      onSelectExercise
                        ? () => onSelectExercise(lesson.id, idx)
                        : undefined
                    }
                  >
                    <span className="lesson-panel-row-num">{idx + 1}</span>
                    <span className="lesson-panel-row-text">
                      {ex.title}
                      <span className="lesson-panel-row-meta">
                        {' · '}
                        {ex.tasks.length} steps
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {hasChallenges ? (
          <>
            <div className="lesson-panel-section-header">Challenges</div>
            <ul className="lesson-panel-list">
              {challenges.map((ch, idx) => (
                <li key={`ch-${idx}`}>
                  <button
                    type="button"
                    className="lesson-panel-row"
                    onClick={
                      onSelectChallenge
                        ? () => onSelectChallenge(lesson.id, idx)
                        : undefined
                    }
                  >
                    <span className="lesson-panel-row-num">{idx + 1}</span>
                    <span className="lesson-panel-row-text">{ch.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <button
        type="button"
        className="lesson-panel-open"
        onClick={() => onOpenLesson(lesson.id)}
      >
        Open Lesson
      </button>
    </aside>
  )
}
