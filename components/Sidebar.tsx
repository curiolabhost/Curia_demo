'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { LessonContent } from './LessonContent'

type SidebarProps = {
  lesson?: Lesson
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
}

const FADE_MS = 150
const PAGE_FADE_MS = 100

export function Sidebar({
  lesson,
  pageIndex,
  setPageIndex,
  totalPages,
}: SidebarProps) {
  const [renderedLesson, setRenderedLesson] = useState<Lesson | undefined>(lesson)
  const [contentFading, setContentFading] = useState(false)
  const [renderedPageIndex, setRenderedPageIndex] = useState(0)
  const [pageVisible, setPageVisible] = useState(true)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lesson?.id === renderedLesson?.id) return
    setContentFading(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setRenderedLesson(lesson)
      setRenderedPageIndex(0)
      setContentFading(false)
    }, FADE_MS)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [lesson, renderedLesson?.id])

  useEffect(() => {
    if (pageIndex === renderedPageIndex) return
    setPageVisible(false)
    if (pageFadeTimerRef.current) clearTimeout(pageFadeTimerRef.current)
    pageFadeTimerRef.current = setTimeout(() => {
      setRenderedPageIndex(pageIndex)
      setPageVisible(true)
    }, PAGE_FADE_MS)
    return () => {
      if (pageFadeTimerRef.current) clearTimeout(pageFadeTimerRef.current)
    }
  }, [pageIndex, renderedPageIndex])

  const renderedTotalPages = renderedLesson?.content.length ?? 0
  const safeRenderedIndex =
    renderedTotalPages > 0
      ? Math.min(renderedPageIndex, renderedTotalPages - 1)
      : 0
  const currentPage = renderedLesson?.content[safeRenderedIndex]
  const isLastPage = safeRenderedIndex === renderedTotalPages - 1

  const isFirst = pageIndex === 0
  const isLast = pageIndex >= totalPages - 1

  return (
    <aside className="sidebar">
      {renderedLesson ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="exercise-counter">
            {totalPages > 1 ? `Page ${pageIndex + 1} of ${totalPages}` : ''}
          </span>
          <div className="exercise-nav-buttons">
            <div className="exercise-nav-button-cell">
              <button
                type="button"
                className="exercise-nav-button"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={isFirst || totalPages <= 1}
                aria-label="Previous page"
              >
                {'←'}
              </button>
            </div>
            <div className="exercise-nav-button-cell">
              <button
                type="button"
                className="exercise-nav-button"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={isLast || totalPages <= 1}
                aria-label="Next page"
              >
                {'→'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        className={`sidebar-content${contentFading ? ' fading' : ''}`}
        style={{
          opacity: pageVisible ? 1 : 0,
          transition: `opacity ${PAGE_FADE_MS}ms ease`,
        }}
      >
        {renderedLesson && currentPage ? (
          <LessonContent
            page={currentPage}
            isLastPage={isLastPage}
            lesson={renderedLesson}
          />
        ) : (
          <div className="empty-state-block">
            Select a lesson from the nav to begin.
          </div>
        )}
      </div>
    </aside>
  )
}
