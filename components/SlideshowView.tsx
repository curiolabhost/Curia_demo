'use client'

import { useEffect, useState } from 'react'
import type { Exercise, Lesson } from '@/lib/lessons'
import type { Deck } from '@/lib/deckTypes'
import { LessonContent } from './LessonContent'

type SlideshowViewProps = {
  lesson: Lesson
  deck: Deck
  pageIndex: number
  onPageChange: (index: number) => void
  onExit: () => void
}

function ChevronLeft({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const enabledBg = hover ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={direction === 'prev' ? 'Previous slide' : 'Next slide'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        border: 'none',
        borderRadius: 6,
        background: disabled ? 'rgba(255,255,255,0.06)' : enabledBg,
        color: disabled ? 'rgba(255,255,255,0.25)' : 'var(--white)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease',
        flexShrink: 0,
      }}
    >
      {direction === 'prev' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  )
}

function ExerciseSlide({ exercise }: { exercise: Exercise }) {
  const format = exercise.format ?? 'code-editor'
  const task = exercise.tasks?.[0] ?? exercise.title ?? ''

  let body: React.ReactNode

  if (format === 'multiple-choice') {
    const options = exercise.options ?? []
    body = (
      <div
        style={{
          marginTop: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {options.map((opt) => (
          <div
            key={opt.id}
            style={{
              border: '1.5px solid var(--border2)',
              borderRadius: 12,
              background: 'var(--surface)',
              padding: '20px 22px',
              fontFamily: opt.code ? 'var(--mono)' : 'var(--sans)',
              fontSize: opt.code ? 15 : 16,
              color: 'var(--text)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {opt.code ?? opt.label}
          </div>
        ))}
      </div>
    )
  } else if (format === 'fill-blank' || format === 'fill-blank-typed') {
    const lines = exercise.codeWithBlanks ?? exercise.codeLines ?? []
    body = (
      <pre
        style={{
          marginTop: 32,
          background: 'var(--surface)',
          border: '1.5px solid var(--border2)',
          borderRadius: 12,
          padding: '20px 24px',
          fontFamily: 'var(--mono)',
          fontSize: 16,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'left',
        }}
      >
        {lines.map((line, i) => (
          <div key={i}>{line.replace(/<<[^>]+>>/g, '________')}</div>
        ))}
      </pre>
    )
  } else {
    body = (
      <div
        style={{
          marginTop: 32,
          fontSize: 16,
          color: 'var(--text3)',
          textAlign: 'center',
        }}
      >
        Students complete this on their devices
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text3)',
          background: 'var(--surface2)',
          borderRadius: 20,
          padding: '4px 12px',
        }}
      >
        {format}
      </span>
      <div
        style={{
          marginTop: 24,
          fontFamily: 'var(--sans)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.3,
        }}
      >
        {task}
      </div>
      {body}
    </div>
  )
}

export function SlideshowView({
  lesson,
  deck,
  pageIndex,
  onPageChange,
  onExit,
}: SlideshowViewProps) {
  const enabledSlides = deck.filter((s) => s.enabled)
  const totalPages = enabledSlides.length
  const safeIndex = totalPages > 0 ? Math.max(0, Math.min(pageIndex, totalPages - 1)) : 0
  const currentSlide = totalPages > 0 ? enabledSlides[safeIndex] : null
  const isFirst = safeIndex === 0
  const isLast = totalPages === 0 ? true : safeIndex >= totalPages - 1

  const [exitHover, setExitHover] = useState(false)

  const goPrev = () => {
    if (!isFirst) onPageChange(safeIndex - 1)
  }
  const goNext = () => {
    if (!isLast) onPageChange(safeIndex + 1)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (safeIndex < totalPages - 1) {
          e.preventDefault()
          onPageChange(safeIndex + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (safeIndex > 0) {
          e.preventDefault()
          onPageChange(safeIndex - 1)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        } else {
          onExit()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [safeIndex, totalPages, onPageChange, onExit])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onExit()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [onExit])

  const showDots = totalPages > 1 && totalPages <= 12

  let slideBody: React.ReactNode = null
  if (!currentSlide) {
    slideBody = (
      <div
        style={{
          color: 'var(--text3)',
          fontFamily: 'var(--sans)',
          fontSize: 16,
          textAlign: 'center',
        }}
      >
        No slides in deck. Exit and edit your deck.
      </div>
    )
  } else if (currentSlide.type === 'content') {
    const page = lesson.content[currentSlide.index]
    slideBody = page ? (
      <LessonContent
        page={page}
        isLastPage={isLast}
        lesson={lesson}
        variant="slide"
      />
    ) : null
  } else {
    const exercise = lesson.exercises[currentSlide.index]
    slideBody = exercise ? <ExerciseSlide exercise={exercise} /> : null
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minHeight: 0, width: '100%' }} />

      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--bg)',
          borderRadius: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '52px 72px',
            width: '100%',
            boxSizing: 'border-box',
            flex: currentSlide ? undefined : 1,
            display: currentSlide ? undefined : 'flex',
            alignItems: currentSlide ? undefined : 'center',
            justifyContent: currentSlide ? undefined : 'center',
          }}
        >
          {slideBody}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, width: '100%' }} />

      <div
        style={{
          position: 'relative',
          height: 48,
          width: '100%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 20px',
          background: '#000000',
        }}
      >
        <NavButton direction="prev" disabled={isFirst} onClick={goPrev} />
        <NavButton direction="next" disabled={isLast} onClick={goNext} />

        <span
          style={{
            flex: 1,
            fontFamily: 'var(--sans)',
            fontSize: 12,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {lesson.title}  ·  Slide {totalPages === 0 ? 0 : safeIndex + 1} of {totalPages}
        </span>

        {showDots ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: totalPages }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === safeIndex ? 'var(--white)' : 'rgba(255,255,255,0.25)',
                }}
              />
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {})
            } else {
              onExit()
            }
          }}
          onMouseEnter={() => setExitHover(true)}
          onMouseLeave={() => setExitHover(false)}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 8px',
            color: exitHover ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
            fontFamily: 'var(--sans)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          Exit slideshow
        </button>
      </div>
    </div>
  )
}
