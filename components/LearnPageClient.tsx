'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDevice } from '@/context/DeviceContext'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { Lesson } from '@/lib/lessons'
import { useClassroomContext } from '@/lib/useClassroomContext'
import { useLayoutMode } from '@/lib/useLayoutMode'
import {
  getAdminClassroomLessonsProgress,
  getAdminLessonProgress,
  getClassroomLessonsProgress,
  getLessonProgress,
  type LessonProgressRow,
} from '@/lib/progressClient'
import { useDeck } from '@/lib/useDeck'
import type { Deck } from '@/lib/deckTypes'
import { ImpersonationBanner } from './admin/ImpersonationBanner'
import { InstructorPreviewBanner } from '@/components/InstructorPreviewBanner'
import { DeckEditor } from './DeckEditor'
import { FinalProjectSidebar } from './FinalProjectSidebar'
import { LessonWorkspace } from './LessonWorkspace'
import { NavOverlay } from './NavOverlay'
import { Sidebar } from './Sidebar'
import { SlideshowView } from './SlideshowView'
import { TopBar } from './TopBar'

type ImpersonationState = {
  studentFirstName: string
  studentLastName: string
  classroomId: string
}

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
  const { mode, setMode, splitAllowed, resetLayout } = useLayoutMode()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<'normal' | 'slideshow'>(() =>
    searchParams?.get('view') === 'slide' ? 'slideshow' : 'normal',
  )
  const [deckEditorOpen, setDeckEditorOpen] = useState(false)
  const deckLesson = useMemo<Lesson>(
    () =>
      activeLesson ?? {
        id: '__empty__',
        session: '',
        title: '',
        content: [],
        exercises: [],
      },
    [activeLesson],
  )
  const classroomContext = useClassroomContext()
  const { classroomId, isReady: classroomReady, isImpersonating, role } = classroomContext
  const isInstructorPreview = role === 'ADMIN' && !isImpersonating && !!classroomId
  const { deck, saveDeck } = useDeck(deckLesson, classroomId)
  const [impersonationState, setImpersonationState] = useState<ImpersonationState | null>(null)
  const [progressRows, setProgressRows] = useState<LessonProgressRow[]>([])
  const [resumeIndex, setResumeIndex] = useState<number | null>(null)
  const [resumeMode, setResumeMode] = useState<'exercises' | 'challenges' | null>(null)

  useEffect(() => {
    if (!classroomId || !classroomReady) return
    const fetchProgress = async () => {
      const result = isInstructorPreview
        ? await getAdminClassroomLessonsProgress(classroomId)
        : await getClassroomLessonsProgress(classroomId)
      if (result.ok) setProgressRows(result.lessons)
    }
    fetchProgress()
  }, [classroomId, classroomReady, isInstructorPreview])

  useEffect(() => {
    setResumeIndex(null)
    setResumeMode(null)
  }, [activeLessonId])

  useEffect(() => {
    if (!classroomReady || !classroomId) return
    let cancelled = false
    const fetchResume = async () => {
      const result = isInstructorPreview
        ? await getAdminLessonProgress(classroomId, activeLessonId)
        : await getLessonProgress(classroomId, activeLessonId)
      if (cancelled) return
      if (!result.ok || !result.progress) return
      if (result.progress.lastExerciseIndex > 0) {
        setResumeIndex(result.progress.lastExerciseIndex)
      }
      const m = result.progress.lastMode
      if (m === 'exercises' || m === 'challenges') {
        setResumeMode(m)
      }
    }
    fetchResume()
    return () => {
      cancelled = true
    }
  }, [classroomId, classroomReady, activeLessonId, isInstructorPreview])

  const completedLessonIds = useMemo(
    () =>
      progressRows
        .filter((r) => r.completedAt !== null)
        .map((r) => r.lessonId),
    [progressRows],
  )
  const completedCount = completedLessonIds.length
  const totalCount = lessons.length

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || !data.impersonating) return
        setImpersonationState({
          studentFirstName: data.impersonating.studentFirstName,
          studentLastName: data.impersonating.studentLastName,
          classroomId: data.impersonating.classroomId,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const handleExitImpersonation = useCallback(() => {
    fetch('/api/admin/impersonate/exit', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const target = data && typeof data.redirectTo === 'string' ? data.redirectTo : '/admin'
        setImpersonationState(null)
        router.push(target)
      })
      .catch(() => {})
  }, [router])

  const isReadOnly = impersonationState !== null

  const handleToggleLeft = useCallback(() => {
    if (mode === 'expanded-left') {
      setMode(splitAllowed ? 'split' : 'expanded-right')
    } else {
      setMode('expanded-left')
    }
  }, [mode, splitAllowed, setMode])

  const handleToggleRight = useCallback(() => {
    if (mode === 'expanded-right') {
      setMode(splitAllowed ? 'split' : 'expanded-left')
    } else {
      setMode('expanded-right')
    }
  }, [mode, splitAllowed, setMode])

  const updateViewUrl = useCallback(
    (view: 'normal' | 'slideshow') => {
      const params = new URLSearchParams(searchParams?.toString() ?? '')
      if (view === 'slideshow') {
        params.set('view', 'slide')
      } else {
        params.delete('view')
      }
      const queryString = params.toString()
      const url = `/learn/${activeLessonId}${queryString ? `?${queryString}` : ''}`
      router.replace(url, { scroll: false })
    },
    [searchParams, router, activeLessonId],
  )

  const handleToggleSlideshow = useCallback(() => {
    if (viewMode === 'slideshow') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      setViewMode('normal')
      updateViewUrl('normal')
      return
    }
    if (role === 'ADMIN') {
      setDeckEditorOpen(true)
      return
    }
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
    setViewMode('slideshow')
    updateViewUrl('slideshow')
  }, [viewMode, role, updateViewUrl])

  const handlePresent = useCallback(
    (finalDeck: Deck) => {
      saveDeck(finalDeck)
      setDeckEditorOpen(false)
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
      setViewMode('slideshow')
      updateViewUrl('slideshow')
    },
    [saveDeck, updateViewUrl],
  )

  const exParam = searchParams?.get('ex')
  const parsedEx = exParam !== null && exParam !== undefined ? Number(exParam) : NaN
  const urlInitialExerciseIndex =
    Number.isFinite(parsedEx) && parsedEx >= 0 ? Math.floor(parsedEx) : undefined
  const initialExerciseIndex = resumeIndex ?? urlInitialExerciseIndex

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

  const device = useDevice()
  if (typeof window !== 'undefined') console.log('[Curia] device:', device)

  useEffect(() => {
    fetch('/api/log-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device }),
    }).catch(() => {})
  }, [device])

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

  if (deckEditorOpen && activeLesson) {
    return (
      <DeckEditor
        lesson={activeLesson}
        deck={deck}
        onSave={saveDeck}
        onPresent={handlePresent}
        onClose={() => setDeckEditorOpen(false)}
      />
    )
  }

  if (viewMode === 'slideshow' && activeLesson) {
    return (
      <SlideshowView
        lesson={activeLesson}
        deck={deck}
        pageIndex={Math.min(pageIndex, totalPages - 1)}
        onPageChange={setPageIndex}
        onExit={handleToggleSlideshow}
      />
    )
  }

  if (classroomReady && !classroomId && !isImpersonating) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          color: 'var(--text3)',
          fontFamily: 'inherit',
          fontSize: 15,
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <div style={{ marginBottom: 12 }}>Select a classroom to continue.</div>
          <a
            href="/student/home"
            style={{ color: 'var(--text2)', textDecoration: 'underline' }}
          >
            Go to your classrooms
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {isInstructorPreview && (
        <InstructorPreviewBanner
          onExit={() => {
            window.location.href = '/instructor/home'
          }}
        />
      )}
    <div
      className="app-shell"
      style={{ paddingTop: isInstructorPreview ? '36px' : impersonationState ? 36 : undefined }}
    >
      {impersonationState ? (
        <ImpersonationBanner
          studentFirstName={impersonationState.studentFirstName}
          studentLastName={impersonationState.studentLastName}
          classroomId={impersonationState.classroomId}
          onExit={handleExitImpersonation}
        />
      ) : null}
      <TopBar
        session={session}
        completedCount={completedCount}
        totalCount={totalCount}
        onMenuClick={() => setNavOpen((v) => !v)}
        device={device}
        viewMode={activeLesson ? viewMode : undefined}
        onToggleSlideshow={activeLesson ? handleToggleSlideshow : undefined}
      />
      <NavOverlay
        lessons={lessons}
        activeLessonId={activeLessonId}
        completedIds={completedLessonIds}
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
        <div
          style={{
            width:
              mode === 'expanded-left'  ? '100%' :
              mode === 'expanded-right' ? '0%' :
              '50%',
            transition: splitAllowed
              ? 'width 0.25s ease'
              : 'none',
            flexShrink: 0,
            overflow: 'hidden',
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
              layoutMode={mode}
              onToggleLeft={handleToggleLeft}
            />
          )}
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
            transition: splitAllowed ? 'width 0.25s ease' : 'none',
          }}
        >
          {activeLesson ? (
            <LessonWorkspace
              lesson={activeLesson}
              allLessons={lessons}
              prevLessonId={prevLessonId}
              nextLessonId={nextLessonId}
              pageIndex={pageIndex}
              setPageIndex={setPageIndex}
              totalPages={totalPages}
              layoutMode={mode}
              onResetLayout={resetLayout}
              onToggleRight={handleToggleRight}
              initialExerciseIndex={initialExerciseIndex}
              initialMode={resumeMode ?? undefined}
              onExerciseIndexChange={setActiveExerciseIndex}
              onActiveBankIndexChange={setActiveBankIndex}
              onLineSelect={(li, bi) => {
                setSelectedLineIndex(li)
                setSelectedBlankIndex(bi)
              }}
              editMode={editMode}
              editActions={editActions}
              isReadOnly={isReadOnly || isInstructorPreview}
              classroomId={classroomId}
              role={role ?? undefined}
            />
          ) : (
            <div className="right-panel">
              <div style={{ padding: 24, color: 'var(--text2)' }}>Lesson not found.</div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
