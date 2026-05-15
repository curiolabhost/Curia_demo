'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { Lesson } from '@/lib/lessons'
import type { LayoutMode } from '@/lib/useLayoutMode'
import { loadCode } from '@/lib/storage'
import { runInSandbox, type CheckResult, type LogEntry } from '@/lib/sandbox'
import { BottomBar } from './BottomBar'
import { ChallengePrompt } from './ChallengePrompt'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { ExercisePrompt } from './ExercisePrompt'
import { HomeView } from './HomeView'
import { CollapseIcon, ExpandIcon } from './icons'
import { OutputConsole } from './OutputConsole'
import {
  CodeEditorPanel,
  FinalProjectPanel,
  getPanelFormat,
  panelRegistry,
} from './exercise-panels'

const TIMEOUT_MS = 5000
const SHORTCUT_GAP_MS = 200
const STATUS_DELAY_MS = 300
const LESSON_FADE_MS = 150
const EXERCISE_FADE_MS = 100

type Mode = 'exercises' | 'challenges'
type StatusType = 'default' | 'ok' | 'err'

type RightPanelProps = {
  lesson: Lesson
  allLessons: Lesson[]
  prevLessonId?: string
  nextLessonId?: string
  pageIndex: number
  setPageIndex: (index: number) => void
  totalPages: number
  layoutMode: LayoutMode
  onResetLayout: () => void
  onToggleRight: () => void
  initialExerciseIndex?: number
  onExerciseIndexChange?: (index: number) => void
  onActiveBankIndexChange?: (index: number) => void
  onLineSelect?: (
    lineIndex: number | null,
    blankIndex: number | null,
  ) => void
  editMode?: boolean
  editActions?: EditActions
}

function isInsideEditor(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest('#editor-wrapper')
}

function isInTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return true
  if (target.isContentEditable) return true
  return false
}

export function RightPanel({
  lesson,
  allLessons,
  prevLessonId,
  nextLessonId,
  pageIndex,
  setPageIndex,
  totalPages,
  layoutMode,
  onResetLayout,
  onToggleRight,
  initialExerciseIndex,
  onExerciseIndexChange,
  onActiveBankIndexChange,
  onLineSelect,
  editMode = false,
  editActions,
}: RightPanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('exercises')
  const [showHome, setShowHome] = useState(false)
  const [exerciseIndex, setExerciseIndex] = useState(initialExerciseIndex ?? 0)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Ready')
  const [statusType, setStatusType] = useState<StatusType>('default')
  const [stepPromptState, setStepPromptState] = useState<{
    currentStepIndex: number
    completedSteps: Set<number>
  } | null>(null)

  const [renderedLesson, setRenderedLesson] = useState<Lesson>(lesson)
  const [renderedExerciseIndex, setRenderedExerciseIndex] = useState(initialExerciseIndex ?? 0)
  const [lessonFading, setLessonFading] = useState(false)
  const [exerciseFading, setExerciseFading] = useState(false)

  const editorRef = useRef<CodeEditorHandle | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastShortcutRef = useRef<number>(0)
  const runEntriesRef = useRef<LogEntry[]>([])
  const runCheckResultsRef = useRef<CheckResult[]>([])
  const hasChecksRef = useRef<boolean>(false)
  const lessonFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exerciseFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const challenges = renderedLesson.challenges ?? []
  const activeExercise = renderedLesson.exercises[renderedExerciseIndex]
  const activeChallenge = challenges[challengeIndex]
  const totalExercises = renderedLesson.exercises.length
  const totalChallenges = challenges.length
  const hasChallenges = totalChallenges > 0

  const isFinalProjectLesson =
    renderedLesson.exercises.length > 0 &&
    renderedLesson.exercises[0].format === 'final-project'
  const finalProjectFallback = isFinalProjectLesson
    ? renderedLesson.exercises[totalExercises - 1]
    : undefined
  const panelExercise = activeExercise ?? finalProjectFallback

  const solved =
    mode === 'challenges' &&
    (activeChallenge?.checks?.length ?? 0) > 0 &&
    checkResults.length > 0 &&
    checkResults.every((r) => r.passed)

  // In edit mode, sync the rendered lesson to the live lesson on every
  // change (the lesson identity changes on each edit but the id stays
  // the same, so the cross-fade effect below would not pick it up).
  useEffect(() => {
    if (!editMode) return
    if (lesson === renderedLesson) return
    setRenderedLesson(lesson)
  }, [editMode, lesson, renderedLesson])

  // Cross-fade on lesson change
  useEffect(() => {
    if (lesson.id === renderedLesson.id) return
    setLessonFading(true)
    if (lessonFadeTimerRef.current) clearTimeout(lessonFadeTimerRef.current)
    lessonFadeTimerRef.current = setTimeout(() => {
      const seedIndex = initialExerciseIndex ?? 0
      setRenderedLesson(lesson)
      setRenderedExerciseIndex(seedIndex)
      setExerciseIndex(seedIndex)
      setChallengeIndex(0)
      setMode('exercises')
      setHintVisible(false)
      setEntries([])
      setCheckResults([])
      setStepPromptState(null)
      setStatusMsg('Ready')
      setStatusType('default')
      setIsRunning(false)
      runEntriesRef.current = []
      runCheckResultsRef.current = []
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
      setLessonFading(false)
    }, LESSON_FADE_MS)
    return () => {
      if (lessonFadeTimerRef.current) clearTimeout(lessonFadeTimerRef.current)
    }
  }, [lesson, renderedLesson.id, initialExerciseIndex])

  // Cross-fade on exercise change
  useEffect(() => {
    if (exerciseIndex === renderedExerciseIndex) return
    setExerciseFading(true)
    if (exerciseFadeTimerRef.current) clearTimeout(exerciseFadeTimerRef.current)
    exerciseFadeTimerRef.current = setTimeout(() => {
      setRenderedExerciseIndex(exerciseIndex)
      setHintVisible(false)
      setEntries([])
      setCheckResults([])
      setStepPromptState(null)
      setStatusMsg('Ready')
      setStatusType('default')
      setIsRunning(false)
      runEntriesRef.current = []
      runCheckResultsRef.current = []
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
      setExerciseFading(false)
    }, EXERCISE_FADE_MS)
    return () => {
      if (exerciseFadeTimerRef.current) clearTimeout(exerciseFadeTimerRef.current)
    }
  }, [exerciseIndex, renderedExerciseIndex])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      if (lessonFadeTimerRef.current) clearTimeout(lessonFadeTimerRef.current)
      if (exerciseFadeTimerRef.current) clearTimeout(exerciseFadeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    onExerciseIndexChange?.(exerciseIndex)
  }, [exerciseIndex, onExerciseIndexChange])

  useEffect(() => {
    const handler = (event: Event) => {
      const ce = event as CustomEvent<{ index: number }>
      const idx = ce.detail?.index
      if (typeof idx !== 'number') return
      if (idx < 0) return
      setExerciseIndex(idx)
    }
    window.addEventListener('fp:goto-block', handler)
    return () => window.removeEventListener('fp:goto-block', handler)
  }, [])

  const clearRunState = useCallback(() => {
    setHintVisible(false)
    setEntries([])
    setCheckResults([])
    setStepPromptState(null)
    setStatusMsg('Ready')
    setStatusType('default')
    runEntriesRef.current = []
    runCheckResultsRef.current = []
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (statusTimerRef.current) { clearTimeout(statusTimerRef.current); statusTimerRef.current = null }
  }, [])

  const handleModeSwitch = useCallback((next: Mode) => {
    if (next === mode) return
    setMode(next)
    setChallengeIndex(0)
    clearRunState()
  }, [mode, clearRunState])

  const handleChallengeNavigate = useCallback((index: number) => {
    setChallengeIndex(index)
    clearRunState()
  }, [clearRunState])

  const updateStatusFromEntries = useCallback(() => {
    const list = runEntriesRef.current
    const hasError = list.some((e) => e.type === 'error')
    if (hasError) {
      setStatusMsg('Error — check console')
      setStatusType('err')
    } else if (list.length > 0) {
      setStatusMsg('Ran successfully')
      setStatusType('ok')
    } else {
      setStatusMsg('No output')
      setStatusType('default')
    }
  }, [])

  const scheduleStatusUpdate = useCallback(() => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    statusTimerRef.current = setTimeout(() => {
      updateStatusFromEntries()
      statusTimerRef.current = null
    }, STATUS_DELAY_MS)
  }, [updateStatusFromEntries])

  const finalizeStatus = useCallback(() => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }
    if (hasChecksRef.current) {
      const results = runCheckResultsRef.current
      const total = results.length
      const failed = results.filter((r) => !r.passed).length
      if (total === 0) {
        updateStatusFromEntries()
      } else if (failed === 0) {
        setStatusMsg('All checks passed')
        setStatusType('ok')
      } else {
        setStatusMsg(`${failed} of ${total} checks failed`)
        setStatusType('err')
      }
    } else {
      updateStatusFromEntries()
    }
  }, [updateStatusFromEntries])

  const handleRun = useCallback(() => {
    if (isRunning) return

    const code = editorRef.current?.getValue() ?? ''
    if (!code.trim()) {
      setStatusMsg('Nothing to run')
      setStatusType('default')
      return
    }

    const active = mode === 'challenges' ? activeChallenge : activeExercise
    const checks = active?.checks ?? []
    hasChecksRef.current = checks.length > 0

    setIsRunning(true)
    setEntries([])
    setCheckResults([])
    setStatusMsg('')
    setStatusType('default')
    runEntriesRef.current = []
    runCheckResultsRef.current = []

    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    const cleanup = runInSandbox(
      code,
      checks,
      (entry) => {
        runEntriesRef.current = [...runEntriesRef.current, entry]
        setEntries(runEntriesRef.current)
        if (!hasChecksRef.current) scheduleStatusUpdate()
      },
      (result) => {
        runCheckResultsRef.current = [...runCheckResultsRef.current, result]
        setCheckResults(runCheckResultsRef.current)
      },
      () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        finalizeStatus()
        setIsRunning(false)
      },
    )

    cleanupRef.current = cleanup

    timeoutRef.current = setTimeout(() => {
      const timeoutEntry: LogEntry = {
        type: 'error',
        args: ['Execution timed out — possible infinite loop'],
      }
      runEntriesRef.current = [...runEntriesRef.current, timeoutEntry]
      setEntries(runEntriesRef.current)
      cleanupRef.current?.()
      cleanupRef.current = null
      timeoutRef.current = null
      finalizeStatus()
      setIsRunning(false)
    }, TIMEOUT_MS)
  }, [isRunning, scheduleStatusUpdate, finalizeStatus, mode, activeExercise, activeChallenge])

  const goPrevExercise = useCallback(() => {
    setExerciseIndex((i) => (i > 0 ? i - 1 : i))
  }, [])

  const goNextExercise = useCallback(() => {
    setExerciseIndex((i) => (i < totalExercises - 1 ? i + 1 : i))
  }, [totalExercises])

  const goPrevLesson = useCallback(() => {
    if (prevLessonId) router.push(`/learn/${prevLessonId}`)
  }, [router, prevLessonId])

  const goNextLesson = useCallback(() => {
    if (nextLessonId) router.push(`/learn/${nextLessonId}`)
  }, [router, nextLessonId])

  const goPrevPage = useCallback(() => {
    if (pageIndex > 0) setPageIndex(pageIndex - 1)
  }, [pageIndex, setPageIndex])

  const goNextPage = useCallback(() => {
    if (pageIndex < totalPages - 1) setPageIndex(pageIndex + 1)
  }, [pageIndex, totalPages, setPageIndex])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const inEditor = isInsideEditor(target)

      if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.key === '\n')) {
        e.preventDefault()
        const now = Date.now()
        if (now - lastShortcutRef.current < SHORTCUT_GAP_MS) return
        lastShortcutRef.current = now
        const lessonExercises = renderedLesson.exercises
        const isFpLesson =
          lessonExercises.length > 0 &&
          lessonExercises[0].format === 'final-project'
        const kbExercise =
          activeExercise ?? (isFpLesson ? lessonExercises[lessonExercises.length - 1] : undefined)
        const inPanelFormat = mode === 'exercises' && !!kbExercise
        if (inPanelFormat) {
          document.dispatchEvent(new CustomEvent('panel:check-answer'))
        } else {
          handleRun()
        }
        return
      }

      if (inEditor) return

      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key === ']' || e.code === 'BracketRight') {
          e.preventDefault()
          goNextLesson()
          return
        }
        if (e.key === '[' || e.code === 'BracketLeft') {
          e.preventDefault()
          goPrevLesson()
          return
        }
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        if (e.key === ']' || e.code === 'BracketRight') {
          e.preventDefault()
          if (mode === 'challenges') {
            handleChallengeNavigate(Math.min(challengeIndex + 1, totalChallenges - 1))
          } else {
            goNextExercise()
          }
          return
        }
        if (e.key === '[' || e.code === 'BracketLeft') {
          e.preventDefault()
          if (mode === 'challenges') {
            handleChallengeNavigate(Math.max(challengeIndex - 1, 0))
          } else {
            goPrevExercise()
          }
          return
        }
        if (e.key === ',' || e.code === 'Comma') {
          e.preventDefault()
          goPrevPage()
          return
        }
        if (e.key === '.' || e.code === 'Period') {
          e.preventDefault()
          goNextPage()
          return
        }
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'h' || e.key === 'H')) {
        if (isInTextField(target)) return
        e.preventDefault()
        const active = mode === 'challenges' ? activeChallenge : activeExercise
        if (active?.hint) setHintVisible((v) => !v)
        return
      }

      if (e.key === 'Escape') {
        if (hintVisible) {
          e.preventDefault()
          setHintVisible(false)
          return
        }
        if (target instanceof HTMLElement && target.closest('#editor-wrapper')) {
          target.blur()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [
    handleRun,
    goNextExercise,
    goPrevExercise,
    goNextLesson,
    goPrevLesson,
    renderedLesson,
    goNextPage,
    goPrevPage,
    handleChallengeNavigate,
    mode,
    activeExercise,
    activeChallenge,
    challengeIndex,
    totalChallenges,
    hintVisible,
  ])

  const handleClear = useCallback(() => {
    setEntries([])
    setCheckResults([])
    runEntriesRef.current = []
    runCheckResultsRef.current = []
  }, [])

  const isFading = exerciseFading || lessonFading

  const activeHint = mode === 'challenges' ? activeChallenge?.hint : activeExercise?.hint
  const editorExerciseIndex = mode === 'challenges' ? 1000 + challengeIndex : renderedExerciseIndex
  const editorStarterCode = mode === 'challenges'
    ? (activeChallenge?.starterCode ?? '')
    : activeExercise
      ? activeExercise.carryFrom !== undefined
        ? loadCode(renderedLesson.id, activeExercise.carryFrom, activeExercise.starterCode ?? '')
        : (activeExercise.starterCode ?? '')
      : ''
  const hasActiveItem = mode === 'challenges' ? !!activeChallenge : !!activeExercise

  const activeFormat = panelExercise ? getPanelFormat(panelExercise) : 'code-editor'
  const isPanelFormat = mode === 'exercises' && !!panelExercise
  const isFinalProject = isPanelFormat && activeFormat === 'final-project'
  const isCodeEditor = isPanelFormat && activeFormat === 'code-editor'

  const handlePanelComplete = useCallback((correct: boolean) => {
    if (!correct) return
    if (isFinalProjectLesson) {
      setExerciseIndex((i) => Math.min(i + 1, totalExercises))
    } else {
      goNextExercise()
    }
  }, [goNextExercise, isFinalProjectLesson, totalExercises])

  const handleHomeToggle = useCallback(() => {
    setShowHome((v) => {
      const next = !v
      if (!next) {
        onResetLayout()
      }
      return next
    })
  }, [onResetLayout])

  const handleHomeNavigate = useCallback(
    (lessonId: string, exIndex: number) => {
      setShowHome(false)
      onResetLayout()
      if (lessonId === lesson.id) {
        setExerciseIndex(exIndex)
      } else {
        router.push(`/learn/${lessonId}?ex=${exIndex}`)
      }
    },
    [lesson.id, router, onResetLayout],
  )

  const handleHomeClose = useCallback(() => {
    setShowHome(false)
    onResetLayout()
  }, [onResetLayout])

  const rightPanelStyle: React.CSSProperties | undefined = showHome
    ? { gridTemplateRows: 'auto 1fr' }
    : isPanelFormat
      ? { gridTemplateRows: 'auto 1fr' }
      : undefined

  const handleModeButtonClick = (next: Mode) => {
    if (showHome) {
      setShowHome(false)
      onResetLayout()
    }
    handleModeSwitch(next)
  }

  const modeTabBar = (
    <div className="mode-tab-bar">
      <button
        type="button"
        className={`home-mode-btn${showHome ? ' active' : ''}`}
        onClick={handleHomeToggle}
        aria-label="Toggle home view"
        title="Home"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
      </button>
      <span className="home-mode-divider" aria-hidden />
      <button
        type="button"
        className={`mode-tab${!showHome && mode === 'exercises' ? ' active' : ''}`}
        onClick={() => handleModeButtonClick('exercises')}
      >
        Exercises
      </button>
      <button
        type="button"
        className={`mode-tab${!showHome && mode === 'challenges' ? ' active' : ''}`}
        onClick={() => handleModeButtonClick('challenges')}
        disabled={!hasChallenges}
      >
        Challenges
      </button>
      <span style={{ flex: 1 }} aria-hidden />
      {!showHome && !isFinalProject ? (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            type="button"
            className="exercise-nav-button"
            onClick={() =>
              mode === 'exercises'
                ? goPrevExercise()
                : handleChallengeNavigate(challengeIndex - 1)
            }
            disabled={
              mode === 'exercises'
                ? renderedExerciseIndex === 0
                : challengeIndex === 0
            }
            aria-label="Previous"
            style={{ width: '26px', height: '26px' }}
          >
            {'←'}
          </button>
          <button
            type="button"
            className="exercise-nav-button"
            onClick={() =>
              mode === 'exercises'
                ? goNextExercise()
                : handleChallengeNavigate(challengeIndex + 1)
            }
            disabled={
              mode === 'exercises'
                ? renderedExerciseIndex >= totalExercises - 1
                : challengeIndex >= totalChallenges - 1
            }
            aria-label="Next"
            style={{ width: '26px', height: '26px' }}
          >
            {'→'}
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="home-mode-btn"
        onClick={onToggleRight}
        aria-label={
          layoutMode === 'expanded-right'
            ? 'Collapse exercise panel'
            : 'Expand exercise panel'
        }
        title={layoutMode === 'expanded-right' ? 'Collapse' : 'Expand'}
      >
        {layoutMode === 'expanded-right' ? <CollapseIcon /> : <ExpandIcon />}
      </button>
    </div>
  )

  return (
    <div className="right-panel" style={rightPanelStyle}>
      {showHome ? (
        <>
          <div>{modeTabBar}</div>
          <HomeView
            allLessons={allLessons}
            activeLessonId={lesson.id}
            activeExerciseIndex={exerciseIndex}
            onNavigate={handleHomeNavigate}
            onClose={handleHomeClose}
          />
        </>
      ) : (
        <>
          <div>
            {modeTabBar}

            {isFinalProject ? null : mode === 'exercises' ? (
              activeExercise ? (
                <ExercisePrompt
                  exercises={renderedLesson.exercises}
                  activeIndex={renderedExerciseIndex}
                  hintVisible={hintVisible}
                  isFading={isFading}
                  currentStepIndex={stepPromptState?.currentStepIndex}
                  completedSteps={stepPromptState?.completedSteps}
                />
              ) : (
                <section className="exercise-prompt">
                  <div className="empty-state-block">No exercises for this lesson.</div>
                </section>
              )
            ) : (
              <ChallengePrompt
                challenges={challenges}
                activeIndex={challengeIndex}
                hintVisible={hintVisible}
                solved={solved}
                isFading={isFading}
              />
            )}
          </div>

          {isPanelFormat && panelExercise ? (
            <div
              className={`panel-region${isFading ? ' fading' : ''}`}
              style={{ height: '100%' }}
            >
              {isFinalProject ? (
                <FinalProjectPanel
                  exercise={panelExercise}
                  onComplete={handlePanelComplete}
                  allExercises={renderedLesson.exercises}
                  activeIndex={renderedExerciseIndex}
                  lesson={renderedLesson}
                  onActiveBankIndexChange={onActiveBankIndexChange}
                  onLineSelect={onLineSelect}
                  editMode={editMode}
                  editActions={editActions}
                  blockIdx={renderedExerciseIndex}
                />
              ) : isCodeEditor ? (
                <CodeEditorPanel
                  exercise={panelExercise}
                  lessonId={renderedLesson.id}
                  exerciseIndex={renderedExerciseIndex}
                  onComplete={handlePanelComplete}
                  onStepChange={(idx, done) =>
                    setStepPromptState({
                      currentStepIndex: idx,
                      completedSteps: done,
                    })
                  }
                />
              ) : (
                (() => {
                  const PanelComponent = panelRegistry[activeFormat]
                  return PanelComponent ? (
                    <PanelComponent
                      exercise={panelExercise}
                      onComplete={handlePanelComplete}
                    />
                  ) : null
                })()
              )}
            </div>
          ) : (
            <>
              <div className="editor-output">
                {hasActiveItem ? (
                  <CodeEditor
                    ref={editorRef}
                    lessonId={renderedLesson.id}
                    exerciseIndex={editorExerciseIndex}
                    starterCode={editorStarterCode}
                    isFading={isFading}
                  />
                ) : (
                  <div className="editor-pane" />
                )}
                <OutputConsole
                  entries={entries}
                  checkResults={checkResults}
                  onClear={handleClear}
                />
              </div>
              <BottomBar
                onRun={handleRun}
                onHintToggle={() => setHintVisible((v) => !v)}
                hintDisabled={!activeHint}
                isRunning={isRunning}
                statusMessage={statusMsg}
                statusType={statusType}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
