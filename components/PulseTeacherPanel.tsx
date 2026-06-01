'use client'

import { useEffect, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { useLiveSession } from '@/lib/useLiveSession'

type PulseTeacherPanelProps = {
  classroomId: string
  lesson: Lesson
  exerciseIndex: number
  seconds: number
}

function useTick(active: boolean) {
  const [, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setN((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [active])
}

function remainingFrom(pollEndsAt: string | null): number {
  if (!pollEndsAt) return 0
  return Math.max(0, Math.round((new Date(pollEndsAt).getTime() - Date.now()) / 1000))
}

const card: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  bottom: 64,
  zIndex: 110,
  width: 320,
  maxHeight: '70vh',
  overflowY: 'auto',
  background: 'var(--surface)',
  border: '1.5px solid var(--accent)',
  borderRadius: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  padding: 16,
  fontFamily: 'var(--sans)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const btn = (bg: string, color = 'var(--white)'): React.CSSProperties => ({
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'var(--sans)',
  cursor: 'pointer',
  background: bg,
  color,
})

export function PulseTeacherPanel({
  classroomId,
  lesson,
  exerciseIndex,
  seconds,
}: PulseTeacherPanelProps) {
  const { live, activate, start, reveal, end } = useLiveSession({
    classroomId,
    role: 'ADMIN',
  })
  const isActive =
    !!live && live.currentExerciseIndex === exerciseIndex && live.phase !== 'idle'
  useTick(isActive && live?.phase === 'running')

  const remaining = isActive ? remainingFrom(live!.pollEndsAt) : seconds
  const responses = live?.responses ?? []
  const answered = new Set(responses.map((r) => r.membershipId))

  // Not the live question (or nothing live yet): offer to activate this slide.
  if (!isActive) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
          ⚡ Pulse
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          Run this exercise as a live round. Students answer on their devices
          against a {seconds}s timer.
        </div>
        <button type="button" style={btn('var(--accent)')} onClick={() => activate(lesson.id, exerciseIndex, seconds)}>
          Activate Pulse
        </button>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>⚡ Pulse</span>
        <span style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {live!.phase}
        </span>
      </div>

      {live!.phase === 'running' ? (
        <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent)', textAlign: 'center', fontFamily: 'var(--mono)' }}>
          {remaining}s
        </div>
      ) : null}

      <div style={{ fontSize: 13, color: 'var(--text2)' }}>
        {live!.totalParticipants} joined · {live!.answeredCount} answered
      </div>

      {/* Roster: names appear on join, get a ✓ + score as they answer correctly */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {live!.participants.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Waiting for students to join…</span>
        ) : (
          live!.participants.map((p) => {
            const done = answered.has(p.membershipId)
            const r = responses.find((x) => x.membershipId === p.membershipId)
            return (
              <span
                key={p.membershipId}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: done ? 'var(--accent-dim)' : 'var(--surface2, var(--border2))',
                  color: done ? 'var(--accent)' : 'var(--text2)',
                  fontWeight: done ? 700 : 400,
                }}
              >
                {p.name}{done && r ? ` ✓ ${r.score}` : ''}
              </span>
            )
          })
        )}
      </div>

      {live!.phase === 'revealed' && live!.leaderboard ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            🏆 Leaderboard ({live!.correctCount}/{live!.totalParticipants} correct)
          </div>
          {live!.leaderboard.slice(0, 8).map((row) => (
            <div key={row.membershipId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)' }}>
              <span>{row.rank}. {row.name}</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{row.score}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8 }}>
        {live!.phase === 'lobby' ? (
          <button type="button" style={{ ...btn('var(--accent)'), flex: 1 }} onClick={() => start()}>
            Start ▶
          </button>
        ) : null}
        {live!.phase === 'running' ? (
          <button type="button" style={{ ...btn('var(--accent)'), flex: 1 }} onClick={() => reveal()}>
            Reveal now
          </button>
        ) : null}
        <button type="button" style={btn('transparent', 'var(--text3)')} onClick={() => end()}>
          End
        </button>
      </div>
    </div>
  )
}
