'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { Lesson } from '@/lib/lessons'
import { FinalProjectSidebar } from './FinalProjectSidebar'
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
  editMode?: boolean
  editActions?: EditActions
}

export function LearnPageClient({
  lessons,
  activeLesson,
  activeLessonId,
  prevLessonId,
  nextLessonId,
  session,
  editMode = false,
  editActions,
}: LearnPageClientProps) {
  const [navOpen, setNavOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [homeExpanded, setHomeExpanded] = useState(false)

  const searchParams = useSearchParams()
  const exParam = searchParams?.get('ex')
  const parsedEx = exParam !== null && exParam !== undefined ? Number(exParam) : NaN
  const initialExerciseIndex = Number.isFinite(parsedEx) && parsedEx >= 0 ? Math.floor(parsedEx) : undefined

  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number>(
    initialExerciseIndex ?? 0,
  )
  const [activeBankIndex, setActiveBankIndex] = useState<number>(0)
  const [selectedLineIndex, setSelectedLineIndex] = useState<number | null>(
    null,
  )
  const [selectedBlankIndex, setSelectedBlankIndex] = useState<number | null>(
    null,
  )

  useEffect(() => {
    setNavOpen(false)
  }, [activeLessonId])

  useEffect(() => {
    setPageIndex(0)
    setActiveExerciseIndex(initialExerciseIndex ?? 0)
    setActiveBankIndex(0)
    setSelectedLineIndex(null)
    setSelectedBlankIndex(null)
  }, [activeLessonId, initialExerciseIndex])

  const totalPages = activeLesson?.content.length ?? 1
  const isFinalProject =
    !!activeLesson &&
    activeLesson.exercises.length > 0 &&
    activeLesson.exercises[0].format === 'final-project'

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
      <div
        className="app-main"
        style={{
          gridTemplateColumns: homeExpanded ? '0% 1fr' : '50% 1fr',
          transition: 'grid-template-columns 0.25s ease',
        }}
      >
        <div
          style={{
            overflow: 'hidden',
            transition: 'all 0.25s ease',
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isFinalProject && activeLesson ? (
            <FinalProjectSidebar
              lesson={activeLesson}
              activeBlockIndex={activeExerciseIndex}
              activeBankIndex={activeBankIndex}
              selectedLineIndex={selectedLineIndex}
              selectedBlankIndex={selectedBlankIndex}
              allLessons={lessons}
              editMode={editMode}
              editActions={editActions}
            />
          ) : (
            <Sidebar
              lesson={activeLesson}
              pageIndex={pageIndex}
              setPageIndex={setPageIndex}
              totalPages={totalPages}
            />
          )}
        </div>
        {activeLesson ? (
          <LessonWorkspace
            lesson={activeLesson}
            allLessons={lessons}
            prevLessonId={prevLessonId}
            nextLessonId={nextLessonId}
            pageIndex={pageIndex}
            setPageIndex={setPageIndex}
            totalPages={totalPages}
            homeExpanded={homeExpanded}
            setHomeExpanded={setHomeExpanded}
            initialExerciseIndex={initialExerciseIndex}
            onExerciseIndexChange={setActiveExerciseIndex}
            onActiveBankIndexChange={setActiveBankIndex}
            onLineSelect={(li, bi) => {
              setSelectedLineIndex(li)
              setSelectedBlankIndex(bi)
            }}
            editMode={editMode}
            editActions={editActions}
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
