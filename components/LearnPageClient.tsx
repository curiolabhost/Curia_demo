'use client'

import { useEffect, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { LessonWorkspace } from './LessonWorkspace'
import { NavOverlay } from './NavOverlay'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

type LearnPageClientProps = {
  lessons: Lesson[]
  activeLesson?: Lesson
  activeLessonId: string
  prevLessonId?: string
  nextLessonId?: string
  session: string
}

export function LearnPageClient({
  lessons,
  activeLesson,
  activeLessonId,
  prevLessonId,
  nextLessonId,
  session,
}: LearnPageClientProps) {
  const [navOpen, setNavOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setNavOpen(false)
  }, [activeLessonId])

  useEffect(() => {
    setPageIndex(0)
  }, [activeLessonId])

  const totalPages = activeLesson?.content.length ?? 1

  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && navOpen) {
        setNavOpen(false)
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && (e.key === 'b' || e.key === 'B')) {
        const target = e.target
        if (target instanceof HTMLElement && target.closest('#editor-wrapper')) {
          return
        }
        e.preventDefault()
        setNavOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navOpen])

  return (
    <div className="app-shell">
      <TopBar
        session={session}
        completedCount={0}
        totalCount={lessons.length}
        onMenuClick={() => setNavOpen((v) => !v)}
      />
      <NavOverlay
        lessons={lessons}
        activeLessonId={activeLessonId}
        completedIds={[]}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />
      <div
        className={`nav-backdrop${navOpen ? ' open' : ''}`}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />
      <button
        type="button"
        className="nav-edge-toggle"
        onClick={() => setNavOpen((v) => !v)}
        aria-label={navOpen ? 'Close lesson nav' : 'Open lesson nav'}
      >
        <span className="nav-edge-toggle-icon">{navOpen ? '‹' : '›'}</span>
      </button>
      <div className="app-main">
        <Sidebar
          lesson={activeLesson}
          pageIndex={pageIndex}
          setPageIndex={setPageIndex}
          totalPages={totalPages}
        />
        {activeLesson ? (
          <LessonWorkspace
            lesson={activeLesson}
            prevLessonId={prevLessonId}
            nextLessonId={nextLessonId}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            totalPages={totalPages}
          />
        ) : (
          <div className="right-panel">
            <div style={{ padding: 24, color: 'var(--text2)' }}>Lesson not found.</div>
          </div>
        )}
      </div>
    </div>
  )
}
