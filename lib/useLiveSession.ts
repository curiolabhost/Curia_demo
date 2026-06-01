'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LivePhase } from './live'

export type LiveParticipantView = { membershipId: string; name: string }
export type LiveResponseView = {
  membershipId: string
  name: string
  isCorrect: boolean
  score: number
  submittedAt: string
}
export type LeaderboardRow = {
  membershipId: string
  name: string
  score: number
  rank: number
}

export type LiveState = {
  sessionId: string
  lessonId: string
  phase: LivePhase
  currentSlideType: string | null
  currentExerciseIndex: number | null
  pollEndsAt: string | null
  durationSeconds: number | null
  secondsRemaining: number
  participants: LiveParticipantView[]
  answeredCount: number
  totalParticipants: number
  // teacher-only
  correctCount?: number
  responses?: LiveResponseView[]
  leaderboard?: LeaderboardRow[] | null
  // student-only
  you?: {
    joined: boolean
    answered: boolean
    isCorrect: boolean | null
    score: number
    rank: number | null
    totalScore: number
  }
}

type Options = {
  classroomId: string
  role: 'ADMIN' | 'STUDENT'
  enabled?: boolean
}

const ACTIVE_INTERVAL = 1000
const IDLE_INTERVAL = 2500

export function useLiveSession({ classroomId, role, enabled = true }: Options) {
  const [live, setLive] = useState<LiveState | null>(null)
  const [loaded, setLoaded] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopped = useRef(false)

  const base = `/api/classroom/${classroomId}/live`

  const fetchState = useCallback(async (): Promise<LiveState | null> => {
    const res = await fetch(`${base}/state`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return data.ok ? (data.live as LiveState | null) : null
  }, [base])

  const refresh = useCallback(async () => {
    const next = await fetchState()
    setLive(next)
    setLoaded(true)
    return next
  }, [fetchState])

  // Adaptive polling loop, paused while the tab is hidden.
  useEffect(() => {
    if (!enabled) return
    stopped.current = false

    const tick = async () => {
      if (stopped.current) return
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        schedule(IDLE_INTERVAL)
        return
      }
      let next: LiveState | null = null
      try {
        next = await fetchState()
      } catch {
        // transient network error — keep polling
      }
      if (stopped.current) return
      setLive(next)
      setLoaded(true)
      const interval = next?.phase === 'running' ? ACTIVE_INTERVAL : IDLE_INTERVAL
      schedule(interval)
    }

    const schedule = (ms: number) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(tick, ms)
    }

    tick()
    return () => {
      stopped.current = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [enabled, fetchState])

  const post = useCallback(
    async (path: string, body: unknown) => {
      const res = await fetch(`${base}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      await refresh()
      return data as { ok: boolean; error?: string; score?: number }
    },
    [base, refresh],
  )

  // Teacher controls
  const activate = useCallback(
    (lessonId: string, exerciseIndex: number, durationSeconds: number) =>
      post('control', { action: 'activate', lessonId, exerciseIndex, durationSeconds }),
    [post],
  )
  const start = useCallback(() => post('control', { action: 'start' }), [post])
  const reveal = useCallback(() => post('control', { action: 'reveal' }), [post])
  const end = useCallback(() => post('control', { action: 'end' }), [post])
  const focusEditor = useCallback(
    (lessonId: string, exerciseIndex: number) =>
      post('control', { action: 'focus-editor', lessonId, exerciseIndex }),
    [post],
  )
  const exitFocus = useCallback(() => post('control', { action: 'exit-focus' }), [post])

  // Student actions
  const join = useCallback(() => post('join', {}), [post])
  const respond = useCallback(
    (exerciseIndex: number, isCorrect: boolean, answer?: unknown) =>
      post('respond', { exerciseIndex, isCorrect, answer }),
    [post],
  )

  return {
    live,
    loaded,
    refresh,
    role,
    activate,
    start,
    reveal,
    end,
    focusEditor,
    exitFocus,
    join,
    respond,
  }
}
