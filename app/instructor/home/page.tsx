'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import './instructor-home.css'

type Classroom = {
  classroomId: string
  name: string
  role: 'STUDENT' | 'ADMIN'
  isOwner?: boolean
  joinedAt: string
  joinCode: string
  subject: string | null
  description: string | null
  studentCount: number
}

type AuthMe = {
  ok: true
  firstName: string
  lastName: string
}

function UsersIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="5" cy="4" r="2" />
      <path d="M1 11c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" />
      <path d="M9 6c1.2 0 2.5.7 2.5 2.5" />
      <circle cx="9.5" cy="3" r="1.5" />
    </svg>
  )
}

function ClassroomCard({
  classroom,
  onClick,
}: {
  classroom: Classroom
  onClick: () => void
}) {
  return (
    <div className="ih-card" onClick={onClick}>
      {classroom.subject && (
        <div className="ih-card-subject">{classroom.subject}</div>
      )}
      <div className="ih-card-name">{classroom.name}</div>
      <div className="ih-card-footer">
        <div className="ih-card-meta">
          <UsersIcon />
          <span>{classroom.studentCount} students</span>
        </div>
        <div className="ih-card-code">{classroom.joinCode}</div>
      </div>
    </div>
  )
}

function ClassroomSection({
  title,
  classrooms,
  emptyText,
  onOpen,
}: {
  title: string
  classrooms: Classroom[]
  emptyText: string
  onOpen: (classroom: Classroom) => void
}) {
  const countLabel = `${classrooms.length} ${classrooms.length === 1 ? 'classroom' : 'classrooms'}`

  return (
    <section className="ih-section">
      <div className="ih-section-header">
        <h2 className="ih-section-title">{title}</h2>
        <span className="ih-section-count">{countLabel}</span>
      </div>
      {classrooms.length === 0 ? (
        <div className="ih-empty">{emptyText}</div>
      ) : (
        <div className="ih-grid">
          {classrooms.map((classroom) => (
            <ClassroomCard
              key={classroom.classroomId}
              classroom={classroom}
              onClick={() => onOpen(classroom)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function InstructorHomePage() {
  const router = useRouter()

  const [user, setUser] = useState<{ firstName: string; lastName: string } | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSubmitting, setJoinSubmitting] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)

  async function fetchClassrooms(): Promise<Classroom[]> {
    const res = await fetch('/api/classroom/mine', { cache: 'no-store' })
    if (!res.ok) throw new Error('classroom_fetch_failed')
    const data = await res.json()
    return (data.classrooms ?? []) as Classroom[]
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [meRes, classroomsList] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetchClassrooms(),
        ])
        if (!meRes.ok) throw new Error('me_fetch_failed')
        const me = (await meRes.json()) as AuthMe
        if (cancelled) return
        setUser({ firstName: me.firstName, lastName: me.lastName })
        setClassrooms(classroomsList)
      } catch {
        if (!cancelled) setError('Could not load your classrooms.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : ''

  const ownedClassrooms = classrooms.filter((c) => c.isOwner === true)
  const joinedClassrooms = classrooms.filter((c) => c.isOwner === false)

  function openClassroom(classroom: Classroom) {
    router.push(`/instructor/classroom/${classroom.classroomId}`)
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  function mapCreateError(code: string): string {
    if (code === 'name_too_short') return 'Name must be at least 2 characters.'
    if (code === 'name_too_long') return 'Name must be under 50 characters.'
    return 'Something went wrong.'
  }

  function mapJoinError(code: string): string {
    if (code === 'classroom_not_found') return 'Classroom not found.'
    if (code === 'invalid_key') return 'Admin key not found.'
    if (code === 'key_already_used') return 'This key has already been used.'
    if (code === 'already_member') return 'You are already in this classroom.'
    return 'Something went wrong.'
  }

  async function handleCreateSubmit() {
    setCreateError(null)
    setCreateSubmitting(true)
    try {
      const res = await fetch('/api/classroom/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName,
          subject: newSubject || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setCreateError(mapCreateError(data?.error ?? ''))
        return
      }
      console.log('[create classroom] success', {
        joinCode: data.joinCode,
        adminKey: data.adminKey,
      })
      setShowCreateForm(false)
      setNewClassName('')
      setNewSubject('')
      const list = await fetchClassrooms()
      setClassrooms(list)
    } catch {
      setCreateError('Something went wrong.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleJoinSubmit() {
    setJoinError(null)
    setJoinSubmitting(true)
    try {
      const res = await fetch('/api/classroom/join/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode, adminKey }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setJoinError(mapJoinError(data?.error ?? ''))
        return
      }
      setShowJoinForm(false)
      setJoinCode('')
      setAdminKey('')
      const list = await fetchClassrooms()
      setClassrooms(list)
    } catch {
      setJoinError('Something went wrong.')
    } finally {
      setJoinSubmitting(false)
    }
  }

  return (
    <div className="instructor-home-page">
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
            onClick={handleSignOut}
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

      <main className="ih-main">
        <div className="ih-header">
          <div>
            <h1 className="ih-title">My classrooms</h1>
            <p className="ih-sub">Manage your classrooms or join one as an admin</p>
          </div>
          <div className="ih-header-actions">
            <button
              type="button"
              className="ih-join-btn"
              onClick={() => {
                setShowJoinForm(true)
                setShowCreateForm(false)
              }}
            >
              Join a classroom
            </button>
            <button
              type="button"
              className="ih-create-btn"
              onClick={() => {
                setShowCreateForm(true)
                setShowJoinForm(false)
              }}
            >
              Create classroom
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="ih-join-form">
            <button
              type="button"
              className="ih-join-close"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text)',
                marginBottom: '20px',
              }}
            >
              Create a classroom
            </div>

            <label htmlFor="ih-new-name">Classroom name</label>
            <input
              id="ih-new-name"
              type="text"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="e.g. Summer Intro to JavaScript"
            />

            <label htmlFor="ih-new-subject">Subject (optional)</label>
            <input
              id="ih-new-subject"
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. JavaScript"
            />

            <button
              type="button"
              className="ih-join-submit"
              onClick={handleCreateSubmit}
              disabled={createSubmitting}
            >
              Create classroom
            </button>
            {createError && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--orange)',
                  marginTop: '12px',
                }}
              >
                {createError}
              </div>
            )}
          </div>
        )}

        {showJoinForm && (
          <div className="ih-join-form">
            <button
              type="button"
              className="ih-join-close"
              onClick={() => setShowJoinForm(false)}
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
              Join as an admin
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text3)',
                marginBottom: '20px',
              }}
            >
              Enter the classroom join code and your personal admin key
            </div>

            <label htmlFor="ih-join-code">Classroom join code</label>
            <input
              id="ih-join-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. SUMR-2025"
            />

            <label htmlFor="ih-admin-key">Your admin key</label>
            <input
              id="ih-admin-key"
              type="text"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="e.g. brave-falcon-91"
            />

            <button
              type="button"
              className="ih-join-submit"
              onClick={handleJoinSubmit}
              disabled={joinSubmitting}
            >
              Join classroom
            </button>
            {joinError && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--orange)',
                  marginTop: '12px',
                }}
              >
                {joinError}
              </div>
            )}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text3)',
                textAlign: 'center',
                marginTop: '12px',
              }}
            >
              Both codes come from the classroom owner.
            </div>
          </div>
        )}

        {loading ? (
          <div className="ih-empty">Loading your classrooms.</div>
        ) : error ? (
          <div className="ih-empty">{error}</div>
        ) : (
          <>
            <ClassroomSection
              title="My classrooms"
              classrooms={ownedClassrooms}
              emptyText="You have not created any classrooms yet."
              onOpen={openClassroom}
            />

            <ClassroomSection
              title="Joined classrooms"
              classrooms={joinedClassrooms}
              emptyText="You have not joined any classrooms as an admin yet."
              onOpen={openClassroom}
            />
          </>
        )}
      </main>
    </div>
  )
}
