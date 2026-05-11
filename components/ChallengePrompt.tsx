'use client'

import { useEffect, useRef, useState } from 'react'
import type { Challenge } from '@/lib/lessons'

type ChallengePromptProps = {
  challenges: Challenge[]
  activeIndex: number
  hintVisible: boolean
  solved: boolean
  isFading?: boolean
}

const DIFFICULTY_STYLE: Record<Challenge['difficulty'], string> = {
  easy:   'type-practice',
  medium: 'type-predict',
  tricky: 'type-debug',
}

export function ChallengePrompt({
  challenges,
  activeIndex,
  hintVisible,
  solved,
  isFading = false,
}: ChallengePromptProps) {
  const challenge = challenges[activeIndex]
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
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
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
  }, [activeIndex, hintVisible, solved])

  if (!challenge) {
    return (
      <section className="exercise-prompt">
        <div className="empty-state-block">No challenges for this lesson.</div>
      </section>
    )
  }

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
        Challenge {activeIndex + 1} of {challenges.length}
      </div>

      <div className="prompt-header">
        <span className={`type-badge ${DIFFICULTY_STYLE[challenge.difficulty]}`}>
          {challenge.difficulty}
        </span>
        <h2 className="prompt-title">{challenge.title}</h2>
      </div>

      <p className="challenge-description">{challenge.description}</p>

      {hintVisible && challenge.hint ? (
        <div className="hint-row visible">
          <span className="hint-label">Hint:</span>
          <span>{challenge.hint}</span>
        </div>
      ) : null}

      {solved ? (
        <div className="challenge-explanation">
          <span className="hint-label">Explanation:</span>
          <span>{challenge.explanation}</span>
        </div>
      ) : null}

      {showFade ? <div className="prompt-fade" aria-hidden /> : null}
    </section>
  )
}
