'use client'

import { useEffect, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import type { LiveState } from '@/lib/useLiveSession'

type PulseStudentBarProps = {
  live: LiveState | null
  join: () => Promise<{ ok: boolean }>
  lesson: Lesson
  activeExerciseIndex: number
  onFollowEditor?: (exerciseIndex: number) => void
}

function useRemaining(pollEndsAt: string | null, running: boolean): number {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!running || !pollEndsAt) {
      setRemaining(0)
      return
    }
    const compute = () =>
      setRemaining(Math.max(0, Math.round((new Date(pollEndsAt).getTime() - Date.now()) / 1000)))
    compute()
    const id = setInterval(compute, 500)
    return () => clearInterval(id)
  }, [pollEndsAt, running])
  return remaining
}

const barBase: React.CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: 20,
  transform: 'translateX(-50%)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 18px',
  borderRadius: 999,
  fontFamily: 'var(--sans)',
  fontSize: 14,
  fontWeight: 600,
  boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
  maxWidth: 'calc(100vw - 32px)',
}

export function PulseStudentBar({
  live,
  join,
  lesson,
  activeExerciseIndex,
  onFollowEditor,
}: PulseStudentBarProps) {
  const [joinFlash, setJoinFlash] = useState(false)
  const running = live?.phase === 'running'
  const remaining = useRemaining(live?.pollEndsAt ?? null, !!running)

  // Teacher opened the full-screen editor — soft prompt to follow along.
  if (
    live &&
    live.currentSlideType === 'editor' &&
    live.currentExerciseIndex !== null &&
    live.lessonId === lesson.id &&
    onFollowEditor
  ) {
    const idx = live.currentExerciseIndex
    return (
      <button
        type="button"
        onClick={() => onFollowEditor(idx)}
        style={{ ...barBase, background: 'var(--accent)', color: 'var(--white)', border: 'none', cursor: 'pointer' }}
      >
        📝 Teacher opened the editor — Follow along
      </button>
    )
  }

  if (!live || live.phase === 'idle' || live.currentExerciseIndex === null) return null

  const onThisExercise =
    live.lessonId === lesson.id && live.currentExerciseIndex === activeExerciseIndex

  // Live elsewhere — nudge the student toward the live exercise.
  if (!onThisExercise) {
    return (
      <a
        href={`/learn/${live.lessonId}?ex=${live.currentExerciseIndex}`}
        style={{
          ...barBase,
          background: 'var(--accent)',
          color: 'var(--white)',
          textDecoration: 'none',
        }}
      >
        ⚡ Class is live · Exercise {live.currentExerciseIndex + 1} — tap to go
      </a>
    )
  }

  const you = live.you
  const joined = !!you?.joined || joinFlash
  const handleJoin = async () => {
    setJoinFlash(true)
    await join()
    window.setTimeout(() => setJoinFlash(false), 2500)
  }

  let message: React.ReactNode
  if (live.phase === 'lobby') {
    message = "You're in — waiting for your teacher to start"
  } else if (live.phase === 'revealed') {
    message = you?.answered
      ? `${you.isCorrect ? '✓ Correct' : 'No points'} · +${you.score}${you.rank ? ` · #${you.rank}` : ''}`
      : 'Time’s up — no answer'
  } else if (running) {
    message = you?.answered
      ? `Locked in ✓ +${you.score}`
      : 'Answer in the highlighted panel ↗'
  }

  return (
    <div
      style={{
        ...barBase,
        background: 'var(--surface)',
        border: '1.5px solid var(--accent)',
        color: 'var(--text)',
      }}
    >
      <span style={{ color: 'var(--accent)', fontWeight: 800 }}>⚡ Live</span>
      {running ? (
        <span
          style={{
            fontFamily: 'var(--mono)',
            fontWeight: 800,
            color: remaining <= 5 ? '#e5484d' : 'var(--text)',
          }}
        >
          {remaining}s
        </span>
      ) : null}
      <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{message}</span>
      {joinFlash ? (
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓ Joined!</span>
      ) : joined ? (
        <span style={{ color: 'var(--text3)', fontWeight: 600 }}>· joined</span>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          style={{
            border: 'none',
            borderRadius: 999,
            padding: '6px 14px',
            background: 'var(--accent)',
            color: 'var(--white)',
            fontFamily: 'var(--sans)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Join
        </button>
      )}
    </div>
  )
}
