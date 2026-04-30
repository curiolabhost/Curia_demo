'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { loadCode } from '@/lib/storage'
import { runInSandbox, type CheckResult, type LogEntry } from '@/lib/sandbox'
import { BottomBar } from './BottomBar'
import { ChallengePrompt } from './ChallengePrompt'
import { CodeEditor, type CodeEditorHandle } from './CodeEditor'
import { ExercisePrompt } from './ExercisePrompt'
import { OutputConsole } from './OutputConsole'

const TIMEOUT_MS = 5000
const SHORTCUT_GAP_MS = 200
const STATUS_DELAY_MS = 300
const LESSON_FADE_MS = 150
const EXERCISE_FADE_MS = 100

type Mode = 'exercises' | 'challenges'
type StatusType = 'default' | 'ok' | 'err'

type RightPanelProps = {
  lesson: Lesson
  prevLessonId?: string
  nextLessonId?: string
}

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toUpperCase().includes('MAC')
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

export function RightPanel({ lesson, prevLessonId, nextLessonId }: RightPanelProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('exercises')
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Ready')
  const [statusType, setStatusType] = useState<StatusType>('default')
  const [isMac, setIsMac] = useState(false)

  const [renderedLesson, setRenderedLesson] = useState<Lesson>(lesson)
  const [renderedExerciseIndex, setRenderedExerciseIndex] = useState(0)
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

  const solved =
    mode === 'challenges' &&
    (activeChallenge?.checks?.length ?? 0) > 0 &&
    checkResults.length > 0 &&
    checkResults.every((r) => r.passed)

  useEffect(() => {
    setIsMac(detectMac())
  }, [])

  // Cross-fade on lesson change
  useEffect(() => {
    if (lesson.id === renderedLesson.id) return
    setLessonFading(true)
    if (lessonFadeTimerRef.current) clearTimeout(lessonFadeTimerRef.current)
    lessonFadeTimerRef.current = setTimeout(() => {
      setRenderedLesson(lesson)
      setRenderedExerciseIndex(0)
      setExerciseIndex(0)
      setChallengeIndex(0)
      setMode('exercises')
      setHintVisible(false)
      setEntries([])
      setCheckResults([])
      setStatusMsg('Ready')
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
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
      setLessonFading(false)
    }, LESSON_FADE_MS)
    return () => {
      if (lessonFadeTimerRef.current) clearTimeout(lessonFadeTimerRef.current)
    }
  }, [lesson, renderedLesson.id])

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
      setStatusMsg('Ready')
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

  const clearRunState = useCallback(() => {
    setHintVisible(false)
    setEntries([])
    setCheckResults([])
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target
      const inEditor = isInsideEditor(target)

      if ((e.metaKey || e.ctrlKey) && (e.key === 'Enter' || e.key === '\n')) {
        e.preventDefault()
        const now = Date.now()
        if (now - lastShortcutRef.current < SHORTCUT_GAP_MS) return
        lastShortcutRef.current = now
        handleRun()
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

  const shortcutHint = isMac ? '⌘↵' : 'Ctrl+↵'
  const exerciseShortcutPrev = isMac ? '⌘[' : 'Ctrl+['
  const exerciseShortcutNext = isMac ? '⌘]' : 'Ctrl+]'
  const runTitle = isMac ? 'Run code (⌘↵)' : 'Run code (Ctrl+↵)'

  const isFading = exerciseFading || lessonFading

  const activeHint = mode === 'challenges' ? activeChallenge?.hint : activeExercise?.hint
  const editorExerciseIndex = mode === 'challenges' ? 1000 + challengeIndex : renderedExerciseIndex
  const editorStarterCode = mode === 'challenges'
    ? (activeChallenge?.starterCode ?? '')
    : activeExercise
      ? activeExercise.carryFrom !== undefined
        ? loadCode(renderedLesson.id, activeExercise.carryFrom, activeExercise.starterCode)
        : activeExercise.starterCode
      : ''
  const hasActiveItem = mode === 'challenges' ? !!activeChallenge : !!activeExercise

  return (
    <div className="right-panel">
      <div>
        <div className="mode-tab-bar">
          <button
            type="button"
            className={`mode-tab${mode === 'exercises' ? ' active' : ''}`}
            onClick={() => handleModeSwitch('exercises')}
          >
            Exercises
          </button>
          <button
            type="button"
            className={`mode-tab${mode === 'challenges' ? ' active' : ''}`}
            onClick={() => handleModeSwitch('challenges')}
            disabled={!hasChallenges}
          >
            Challenges
          </button>
        </div>

        {mode === 'exercises' ? (
          activeExercise ? (
            <ExercisePrompt
              exercises={renderedLesson.exercises}
              activeIndex={renderedExerciseIndex}
              onNavigate={setExerciseIndex}
              hintVisible={hintVisible}
              isFading={isFading}
              shortcutPrev={exerciseShortcutPrev}
              shortcutNext={exerciseShortcutNext}
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
            onNavigate={handleChallengeNavigate}
            hintVisible={hintVisible}
            solved={solved}
            isFading={isFading}
          />
        )}
      </div>

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
          shortcutHint={shortcutHint}
        />
      </div>
      <BottomBar
        onRun={handleRun}
        onHintToggle={() => setHintVisible((v) => !v)}
        hintDisabled={!activeHint}
        isRunning={isRunning}
        statusMessage={statusMsg}
        statusType={statusType}
        shortcutHint={shortcutHint}
        runTitle={runTitle}
      />
    </div>
  )
}
