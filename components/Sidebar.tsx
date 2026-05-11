'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import type { LayoutMode } from '@/lib/useLayoutMode'
import { CollapseIcon, ExpandIcon } from './icons'
import { LessonContent } from './LessonContent'

type SidebarProps = {
  lesson?: Lesson
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
  layoutMode: LayoutMode
  onToggleLeft: () => void
}

const FADE_MS = 150
const PAGE_FADE_MS = 100

export function Sidebar({
  lesson,
  pageIndex,
  setPageIndex,
  totalPages,
  layoutMode,
  onToggleLeft,
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
            height: '36px',
            padding: '0 8px',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="exercise-nav-button"
            onClick={() => setPageIndex(pageIndex - 1)}
            disabled={isFirst || totalPages <= 1}
            aria-label="Previous page"
            style={{ marginLeft: 'auto' }}
          >
            {'←'}
          </button>
          <button
            type="button"
            className="exercise-nav-button"
            onClick={() => setPageIndex(pageIndex + 1)}
            disabled={isLast || totalPages <= 1}
            aria-label="Next page"
          >
            {'→'}
          </button>
          <button
            type="button"
            className="exercise-nav-button"
            onClick={onToggleLeft}
            aria-label={
              layoutMode === 'expanded-left' ? 'Collapse lesson panel' : 'Expand lesson panel'
            }
            title={layoutMode === 'expanded-left' ? 'Collapse' : 'Expand'}
            style={{ flexShrink: 0 }}
          >
            {layoutMode === 'expanded-left' ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>
      ) : null}
      {totalPages > 1 && (
        <div
          style={{
            padding: '25px 12px 0 24px',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--text3)',
            flexShrink: 0,
          }}
        >
          Page {pageIndex + 1} of {totalPages}
        </div>
      )}
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
