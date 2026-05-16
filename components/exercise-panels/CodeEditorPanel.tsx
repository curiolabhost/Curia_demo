'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CodeEditor, type CodeEditorHandle } from '@/components/CodeEditor'
import { OutputConsole } from '@/components/OutputConsole'
import type { Check, Exercise, TaskStep } from '@/lib/lessons'
import { normalizeStep } from '@/lib/lessons'
import {
  runInSandbox,
  type CheckResult,
  type LogEntry,
} from '@/lib/sandbox'

const TIMEOUT_MS = 5000

type CodeEditorPanelProps = {
  exercise: Exercise
  lessonId: string
  exerciseIndex: number
  onComplete: (correct: boolean) => void
  classroomId?: string | null
  onStepChange?: (
    currentStepIndex: number,
    completedSteps: Set<number>,
    nextEnabled: boolean,
    onNext: () => void,
  ) => void
}

export function CodeEditorPanel({
  exercise,
  lessonId,
  exerciseIndex,
  onComplete,
  classroomId = null,
  onStepChange,
}: CodeEditorPanelProps) {
  const normalizedSteps: TaskStep[] = useMemo(
    () => (exercise.steps ?? []).map(normalizeStep),
    [exercise.steps],
  )

  const isReactive = normalizedSteps.length > 0

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [exerciseValidated, setExerciseValidated] = useState(false)
  const [nextEnabled, setNextEnabled] = useState(false)
  const [stepShake, setStepShake] = useState(false)

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const editorRef = useRef<CodeEditorHandle | null>(null)
  const runEntriesRef = useRef<LogEntry[]>([])
  const runCheckResultsRef = useRef<CheckResult[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onStepChangeRef = useRef(onStepChange)
  const handleNextRef = useRef<() => void>(() => {})
  const stableOnNext = useCallback(() => handleNextRef.current(), [])

  // Keep the latest onStepChange in a ref so the dispatch effect's deps stay
  // limited to actual step state — inline callbacks from the parent won't
  // re-fire it on every render.
  useEffect(() => {
    onStepChangeRef.current = onStepChange
  })

  // Push step state to the parent for reactive exercises only. Legacy/no-step
  // exercises leave parent state at null → ExercisePrompt renders flat.
  useEffect(() => {
    if (!isReactive) return
    onStepChangeRef.current?.(
      currentStepIndex,
      completedSteps,
      nextEnabled,
      stableOnNext,
    )
  }, [isReactive, currentStepIndex, completedSteps, nextEnabled, stableOnNext])

  // Reset everything when the exercise changes (panel is reused across exercises)
  useEffect(() => {
    setCurrentStepIndex(0)
    setCompletedSteps(new Set())
    setExerciseValidated(false)
    setNextEnabled(false)
    setEntries([])
    setCheckResults([])
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
  }, [exercise])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // Apply Monaco decorations for the active step
  const applyCurrentStepDecorations = useCallback(() => {
    if (!isReactive) return
    const allDone =
      normalizedSteps.length > 0 &&
      completedSteps.size === normalizedSteps.length
    const step = !allDone ? normalizedSteps[currentStepIndex] : null
    if (step) {
      editorRef.current?.setFocusLines(step.focusLine, step.focusRange)
    } else {
      editorRef.current?.setFocusLines(undefined, undefined)
    }
  }, [isReactive, normalizedSteps, currentStepIndex, completedSteps])

  useEffect(() => {
    applyCurrentStepDecorations()
  }, [applyCurrentStepDecorations])

  // Reset Next when the active step changes. The new step earns its own
  // arming via either Run-pass or the auto-delay effect below.
  useEffect(() => {
    setNextEnabled(false)
  }, [currentStepIndex])

  const runCode = useCallback(
    (
      code: string,
      checks: Check[],
      onAllDone: (
        results: CheckResult[],
        entries: LogEntry[],
        timedOut: boolean,
      ) => void,
    ) => {
      setIsRunning(true)
      setEntries([])
      setCheckResults([])
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

      let timedOut = false

      const cleanup = runInSandbox(
        code,
        checks,
        (entry) => {
          runEntriesRef.current = [...runEntriesRef.current, entry]
          setEntries(runEntriesRef.current)
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
          setIsRunning(false)
          onAllDone(
            runCheckResultsRef.current,
            runEntriesRef.current,
            timedOut,
          )
        },
      )

      cleanupRef.current = cleanup

      timeoutRef.current = setTimeout(() => {
        timedOut = true
        const timeoutEntry: LogEntry = {
          type: 'error',
          args: ['Execution timed out — possible infinite loop'],
        }
        runEntriesRef.current = [...runEntriesRef.current, timeoutEntry]
        setEntries(runEntriesRef.current)
        cleanupRef.current?.()
        cleanupRef.current = null
        timeoutRef.current = null
        setIsRunning(false)
        onAllDone(runCheckResultsRef.current, runEntriesRef.current, true)
      }, TIMEOUT_MS)
    },
    [],
  )

  const handleStepRun = useCallback(
    (stepIndex: number) => {
      if (isRunning) return
      const code = editorRef.current?.getValue() ?? ''
      if (!code.trim()) return

      if (!isReactive) {
        // Legacy: no steps. Just run with exercise checks.
        const exerciseChecks = exercise.checks ?? []
        runCode(code, exerciseChecks, (allResults, allEntries) => {
          const hasErrors = allEntries.some((e) => e.type === 'error')
          if (
            exerciseChecks.length > 0 &&
            allResults.length === exerciseChecks.length &&
            allResults.every((r) => r.passed) &&
            !hasErrors
          ) {
            editorRef.current?.markComplete()
            onComplete(true)
          }
        })
        return
      }

      const step = normalizedSteps[stepIndex]
      if (!step || step.completesOn !== 'run') return

      const rawStepChecks = step.checks ?? []
      const sourceChecks = rawStepChecks.filter(
        (c) => c.type === 'sourceIncludes',
      )
      const sandboxStepChecks = rawStepChecks.filter(
        (c) => c.type !== 'sourceIncludes',
      )

      // sourceIncludes are evaluated against the editor source, not the sandbox
      const sourceResults: CheckResult[] = sourceChecks.map((c, i) => {
        if (c.type !== 'sourceIncludes') {
          return {
            id: 9000 + i,
            label: '',
            passed: false,
            actual: '',
            checkType: 'console' as const,
          }
        }
        let passed = false
        try {
          const regex = new RegExp(c.pattern, c.flags ?? '')
          passed = regex.test(code)
        } catch {
          passed = false
        }
        return {
          id: 9000 + i,
          label: c.label ?? 'code contains expected pattern',
          passed,
          actual: passed ? 'found' : 'not found',
          checkType: 'console' as const,
        }
      })

      const exerciseChecks = exercise.checks ?? []
      const stepChecksStartIndex = exerciseChecks.length
      const mergedChecks: Check[] = [...exerciseChecks, ...sandboxStepChecks]

      runCode(code, mergedChecks, (allResults, allEntries) => {
        const hasErrors = allEntries.some((e) => e.type === 'error')

        const exerciseResults = allResults.filter(
          (r) => r.id < stepChecksStartIndex,
        )
        const sandboxStepResults = allResults.filter(
          (r) => r.id >= stepChecksStartIndex,
        )
        const allStepResults = [...sandboxStepResults, ...sourceResults]

        // Surface exercise + source results in the console; sandbox step
        // checks are private to the step pass/fail decision.
        setCheckResults([...exerciseResults, ...sourceResults])

        // Exercise-level validation for the "complete" gate (watched effect)
        const exercisePassed =
          exerciseChecks.length === 0
            ? !hasErrors
            : exerciseResults.length === exerciseChecks.length &&
              exerciseResults.every((r) => r.passed) &&
              !hasErrors
        setExerciseValidated(exercisePassed)

        const stepPassed =
          rawStepChecks.length === 0
            ? !hasErrors
            : allStepResults.every((r) => r.passed) && !hasErrors

        if (stepPassed) {
          setCompletedSteps((prev) => new Set(prev).add(stepIndex))
          setNextEnabled(true)
        } else {
          setStepShake(true)
          setTimeout(() => setStepShake(false), 600)
        }
      })
    },
    [
      isRunning,
      isReactive,
      normalizedSteps,
      exercise.checks,
      runCode,
      onComplete,
    ],
  )

  // Arm the Next button for auto steps after their delay. No state advance —
  // the student still has to click Next to move on.
  useEffect(() => {
    const step = normalizedSteps[currentStepIndex]
    if (!step || step.completesOn !== 'auto') return
    const t = setTimeout(() => {
      setCompletedSteps((prev) => new Set(prev).add(currentStepIndex))
      setNextEnabled(true)
    }, step.autoDelayMs ?? 2000)
    return () => clearTimeout(t)
  }, [currentStepIndex, normalizedSteps])

  const handleNext = useCallback(() => {
    if (!nextEnabled) return
    const nextIndex = currentStepIndex + 1
    if (nextIndex >= normalizedSteps.length) {
      const noChecks = !exercise.checks || exercise.checks.length === 0
      if (exerciseValidated || noChecks) {
        onComplete(true)
      }
      return
    }
    setCurrentStepIndex(nextIndex)
    setNextEnabled(false)
  }, [
    nextEnabled,
    currentStepIndex,
    normalizedSteps.length,
    exercise.checks,
    exerciseValidated,
    onComplete,
  ])

  // Keep the ref in sync during render so stableOnNext always invokes the
  // latest handleNext — updating in a post-render effect can leave the ref
  // stale if the parent dispatch effect reads it first.
  handleNextRef.current = handleNext

  // panel:check-answer — Cmd/Ctrl+Enter from RightPanel
  useEffect(() => {
    const handler = () => handleStepRun(currentStepIndex)
    document.addEventListener('panel:check-answer', handler)
    return () => document.removeEventListener('panel:check-answer', handler)
  }, [currentStepIndex, handleStepRun])

  const handleClearOutput = useCallback(() => {
    setEntries([])
    setCheckResults([])
    runEntriesRef.current = []
    runCheckResultsRef.current = []
  }, [])

  const handleEditorReady = useCallback(() => {
    applyCurrentStepDecorations()
  }, [applyCurrentStepDecorations])

  const editorStarter = exercise.contextCode ?? exercise.starterCode ?? ''

  return (
    <div className="code-editor-panel">
      <div className="editor-output">
        <CodeEditor
          ref={editorRef}
          lessonId={lessonId}
          exerciseIndex={exerciseIndex}
          starterCode={editorStarter}
          onReady={handleEditorReady}
          classroomId={classroomId}
        />
        <OutputConsole
          entries={entries}
          checkResults={checkResults}
          onClear={handleClearOutput}
        />
      </div>
      <div className={`bottom-bar${stepShake ? ' shake' : ''}`}>
        <button
          className={`run-button${isRunning ? ' running' : ''}`}
          type="button"
          onClick={() => handleStepRun(currentStepIndex)}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="run-spinner" aria-hidden />
              <span>Running...</span>
            </>
          ) : (
            <>
              <span aria-hidden>▶</span>
              <span>Run</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default CodeEditorPanel
