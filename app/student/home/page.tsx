'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './student-home.css'

type Classroom = {
  classroomId: string
  name: string
  subject?: string | null
  joinedAt: string | null
}

type MeResponse = {
  ok: true
  userId: string
  username: string
  firstName: string
  lastName: string
  role: 'STUDENT' | 'ADMIN'
}

type MineResponse = {
  ok: true
  classrooms: Array<{
    classroomId: string
    name: string
    subject?: string | null
    joinedAt: string
  }>
}

function joinErrorMessage(code: string): string {
  switch (code) {
    case 'classroom_not_found':
      return 'Classroom not found. Check your join code.'
    case 'invalid_key':
      return 'Student key not found. Check your key.'
    case 'key_already_used':
      return 'This key has already been used.'
    case 'already_member':
      return 'You are already in this classroom.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

function formatJoinedAt(iso: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function StudentHomePage() {
  const router = useRouter()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [studentKey, setStudentKey] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const loadClassrooms = useCallback(async () => {
    try {
      const res = await fetch('/api/classroom/mine', {
        method: 'GET',
        credentials: 'same-origin',
      })
      if (!res.ok) return null
      const data = (await res.json()) as MineResponse
      return data.classrooms.map((c) => ({
        classroomId: c.classroomId,
        name: c.name,
        subject: c.subject ?? null,
        joinedAt: c.joinedAt ?? null,
      }))
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      fetch('/api/auth/me', { method: 'GET', credentials: 'same-origin' })
        .then(async (r) => (r.ok ? ((await r.json()) as MeResponse) : null))
        .catch(() => null),
      loadClassrooms(),
    ])
      .then(([me, list]) => {
        if (cancelled) return
        if (!me || !list) {
          setLoadError('Could not load your classrooms.')
          setLoading(false)
          return
        }
        setFirstName(me.firstName ?? '')
        setLastName(me.lastName ?? '')
        setClassrooms(list)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load your classrooms.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [loadClassrooms])

  const handleJoinSubmit = useCallback(async () => {
    if (joining) return
    setJoinError(null)
    setJoining(true)
    try {
      const res = await fetch('/api/classroom/join/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ joinCode, studentKey }),
      })
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null
      if (!res.ok || !data || data.ok === false) {
        setJoinError(joinErrorMessage(data?.error ?? ''))
        setJoining(false)
        return
      }
      const list = await loadClassrooms()
      if (list) setClassrooms(list)
      setShowJoinForm(false)
      setJoinCode('')
      setStudentKey('')
      setJoining(false)
    } catch {
      setJoinError(joinErrorMessage(''))
      setJoining(false)
    }
  }, [joinCode, studentKey, joining, loadClassrooms])

  const handleClassroomClick = useCallback(
    async (classroomId: string) => {
      try {
        const res = await fetch('/api/classroom/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ classroomId }),
        })
        if (!res.ok) return
        router.push('/learn/s2-l1')
      } catch {
        // silent
      }
    },
    [router],
  )

  const initials =
    `${(firstName || '?').charAt(0)}${(lastName || '?').charAt(0)}`.toUpperCase()

  return (
    <div className="student-home-page">
      <nav className="lnav">
        <a href="/" className="logo">
          Cu<em>r</em>ia
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initials}
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              color: 'var(--text3)',
              cursor: 'pointer',
              fontFamily: 'var(--sans)',
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="sh-main">
        <div className="sh-header">
          <div>
            <h1 className="sh-title">My classrooms</h1>
            <p className="sh-sub">Select a classroom to continue, or join a new one</p>
          </div>
          <button
            type="button"
            className="sh-join-btn"
            onClick={() => setShowJoinForm(true)}
          >
            Join a classroom
          </button>
        </div>

        {showJoinForm && (
          <div className="sh-join-form">
            <button
              type="button"
              className="sh-join-close"
              onClick={() => {
                setShowJoinForm(false)
                setJoinError(null)
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '4px',
              }}
            >
              Join a classroom
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text3)',
                marginBottom: '20px',
              }}
            >
              Enter the codes your instructor gave you
            </div>

            <label htmlFor="sh-join-code">Classroom join code</label>
            <input
              id="sh-join-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. SUMR-2025"
            />

            <label htmlFor="sh-student-key">Your student key</label>
            <input
              id="sh-student-key"
              type="text"
              value={studentKey}
              onChange={(e) => setStudentKey(e.target.value)}
              placeholder="e.g. swift-tiger-42"
            />

            <button
              type="button"
              className="sh-join-submit"
              onClick={handleJoinSubmit}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join classroom'}
            </button>
            {joinError ? (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--red, #DC2626)',
                  marginTop: '10px',
                  textAlign: 'center',
                }}
              >
                {joinError}
              </div>
            ) : null}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text3)',
                textAlign: 'center',
                marginTop: '12px',
              }}
            >
              Both codes come from your instructor.
            </div>
          </div>
        )}

        {loading ? (
          <div className="sh-empty">
            <div style={{ fontSize: '14px', color: 'var(--text3)', textAlign: 'center' }}>
              Loading...
            </div>
          </div>
        ) : loadError ? (
          <div className="sh-empty">
            <div style={{ fontSize: '14px', color: 'var(--text3)', textAlign: 'center' }}>
              {loadError}
            </div>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="sh-empty">
            <div style={{ fontSize: '14px', color: 'var(--text3)', textAlign: 'center' }}>
              You have not joined any classrooms yet.
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Use the Join a classroom button above to get started.
            </div>
          </div>
        ) : (
          <div className="sh-grid">
            {classrooms.map((classroom) => (
              <div
                key={classroom.classroomId}
                className="sh-card"
                onClick={() => handleClassroomClick(classroom.classroomId)}
              >
                {classroom.subject && (
                  <div className="sh-card-subject">{classroom.subject}</div>
                )}
                <div className="sh-card-name">{classroom.name}</div>
                <div className="sh-card-meta">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <rect x="1" y="2" width="10" height="9" rx="1" />
                    <path d="M1 5h10M4 1v2M8 1v2" />
                  </svg>
                  {classroom.joinedAt ? `Joined ${formatJoinedAt(classroom.joinedAt)}` : 'Member'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
