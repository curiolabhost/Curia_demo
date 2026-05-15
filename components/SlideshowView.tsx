'use client'

import { useEffect, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { LessonContent } from './LessonContent'

type SlideshowViewProps = {
  lesson: Lesson
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

export function SlideshowView({
  lesson,
  pageIndex,
  onPageChange,
  onExit,
}: SlideshowViewProps) {
  const totalPages = lesson.content.length
  const safeIndex = totalPages > 0 ? Math.max(0, Math.min(pageIndex, totalPages - 1)) : 0
  const currentPage = lesson.content[safeIndex]
  const isFirst = safeIndex === 0
  const isLast = safeIndex >= totalPages - 1

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
          }}
        >
          {currentPage ? (
            <LessonContent
              page={currentPage}
              isLastPage={isLast}
              lesson={lesson}
              variant="slide"
            />
          ) : null}
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
          {lesson.title}  ·  Page {safeIndex + 1} of {totalPages}
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
