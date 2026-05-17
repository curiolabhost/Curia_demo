'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import './instructor-classroom.css'

type ClassroomCard = {
  name: string
  subject: string | null
  description: string | null
  joinCode: string
  studentCount: number
}

type Student = {
  membershipId: string
  firstName: string
  lastName: string
  username: string | null
  userId: string | null
  studentKey: string
  claimed: boolean
  joinedAt: string | null
}

type LessonSummary = {
  lessonId: string
  lastExerciseIndex: number
  completedAt: string | null
}

type StudentProgress = {
  userId: string
  firstName: string
  lastName: string
  membershipId: string
  lessons: LessonSummary[]
}

type Admin = {
  membershipId: string
  adminKey: string
  isOwner: boolean
  claimed: boolean
  joinedAt: string | null
  firstName: string | null
  lastName: string | null
  username: string | null
}

type ClassroomEntry = {
  classroomId: string
  name: string
  isOwner?: boolean
  joinCode: string
  subject: string | null
  description: string | null
  studentCount: number
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

export default function InstructorClassroomPage() {
  const params = useParams<{ classroomId: string }>()
  const router = useRouter()
  const classroomId = params?.classroomId ?? ''

  const [classroom, setClassroom] = useState<ClassroomCard | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [admins, setAdmins] = useState<Admin[]>([])
  const [showAddAdminForm, setShowAddAdminForm] = useState(false)
  const [newAdminFirstName, setNewAdminFirstName] = useState('')
  const [newAdminLastName, setNewAdminLastName] = useState('')
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [addAdminSuccess, setAddAdminSuccess] = useState<string | null>(null)

  async function fetchStudents(): Promise<Student[]> {
    const res = await fetch(`/api/classroom/${classroomId}/students`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('students_fetch_failed')
    const data = await res.json()
    return (data.students ?? []) as Student[]
  }

  async function fetchProgress(): Promise<StudentProgress[]> {
    const res = await fetch(`/api/progress/${classroomId}/summary`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('progress_fetch_failed')
    const data = await res.json()
    return (data.students ?? []) as StudentProgress[]
  }

  async function fetchAdmins(): Promise<Admin[]> {
    const res = await fetch(`/api/classroom/${classroomId}/admins`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('admins_fetch_failed')
    const data = await res.json()
    return (data.admins ?? []) as Admin[]
  }

  async function fetchClassroomCard(): Promise<ClassroomCard | null> {
    const res = await fetch('/api/classroom/mine', { cache: 'no-store' })
    if (!res.ok) throw new Error('classrooms_fetch_failed')
    const data = await res.json()
    const list = (data.classrooms ?? []) as ClassroomEntry[]
    const match = list.find((c) => c.classroomId === classroomId)
    if (!match) return null
    return {
      name: match.name,
      subject: match.subject,
      description: match.description,
      joinCode: match.joinCode,
      studentCount: match.studentCount,
    }
  }

  useEffect(() => {
    if (!classroomId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [card, studentList, progressList, adminList] = await Promise.all([
          fetchClassroomCard(),
          fetchStudents(),
          fetchProgress(),
          fetchAdmins(),
        ])
        if (cancelled) return
        if (!card) {
          setError('Classroom not found.')
          return
        }
        setClassroom(card)
        setStudents(studentList)
        setProgress(progressList)
        setAdmins(adminList)
      } catch {
        if (!cancelled) setError('Could not load this classroom.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId])

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  function mapAddError(code: string): string {
    if (code === 'missing_fields') return 'Please fill in both names.'
    if (code === 'forbidden') return 'You do not have permission.'
    return 'Something went wrong.'
  }

  async function handleAddSubmit() {
    setAddError(null)
    setAddSuccess(null)
    setAddSubmitting(true)
    try {
      const res = await fetch('/api/classroom/add-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          firstName: newFirstName,
          lastName: newLastName,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setAddError(mapAddError(data?.error ?? ''))
        return
      }
      setAddSuccess(`Student added. Their key is: ${data.studentKey}`)
      setNewFirstName('')
      setNewLastName('')
      const list = await fetchStudents()
      setStudents(list)
    } catch {
      setAddError('Something went wrong.')
    } finally {
      setAddSubmitting(false)
    }
  }

  async function handleAddAdmin() {
    if (!newAdminFirstName.trim() || !newAdminLastName.trim()) {
      setAddAdminError('Please fill in both names.')
      return
    }
    setAddAdminError(null)
    setAddAdminSuccess(null)
    try {
      const res = await fetch('/api/classroom/add-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          firstName: newAdminFirstName.trim(),
          lastName: newAdminLastName.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAddAdminSuccess(`Admin added. Their key is: ${data.adminKey}`)
        setNewAdminFirstName('')
        setNewAdminLastName('')
        try {
          const list = await fetchAdmins()
          setAdmins(list)
        } catch {
          // ignore refresh failure
        }
      } else {
        const errorMap: Record<string, string> = {
          missing_fields: 'Please fill in both names.',
          forbidden: 'You do not have permission to add admins.',
          not_owner: 'You do not have permission to add admins.',
          server_error: 'Something went wrong. Please try again.',
        }
        setAddAdminError(errorMap[data.error] ?? 'Something went wrong.')
      }
    } catch {
      setAddAdminError('Something went wrong. Please try again.')
    }
  }

  async function handleEnterLessons() {
    try {
      const res = await fetch('/api/classroom/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId }),
      })
      if (res.ok) {
        window.location.href = '/learn/s2-l1'
      } else {
        console.error('[enter lessons] select failed', await res.json())
      }
    } catch (err) {
      console.error('[enter lessons] error', err)
    }
  }

  async function handleImpersonate(student: Student) {
    if (!student.userId) return
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUserId: student.userId,
          membershipId: student.membershipId,
          classroomId,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) return
      window.location.href = '/learn/s2-l1'
    } catch {
      // ignore
    }
  }

  function progressFor(student: Student): string {
    const entry = progress.find((p) => p.membershipId === student.membershipId)
    if (!entry || entry.lessons.length === 0) return 'No progress yet'
    const completed = entry.lessons.filter((l) => l.completedAt !== null).length
    const total = entry.lessons.length
    return `${completed} / ${total} lessons`
  }

  return (
    <div className="instructor-classroom-page">
      <nav className="lnav">
        <a href="/" className="logo">
          Cu<em>r</em>ia
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="ic-crumbs">
            <a
              href="/instructor/home"
              onClick={(e) => {
                e.preventDefault()
                router.push('/instructor/home')
              }}
            >
              My classrooms
            </a>
            {' / '}
            <span className="ic-crumbs-current">
              {classroom?.name ?? '...'}
            </span>
          </div>
          <button
            type="button"
            className="ic-signout-btn"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="ic-main">
        {loading ? (
          <div className="ic-empty-state">Loading classroom.</div>
        ) : error ? (
          <div className="ic-empty-state">{error}</div>
        ) : classroom ? (
          <>
            <div className="ic-header">
              <h1 className="ic-title">{classroom.name}</h1>
              {classroom.subject && (
                <p className="ic-subject">{classroom.subject}</p>
              )}
              <div className="ic-meta-row">
                <div className="ic-meta-item">
                  <label>Join code</label>
                  <span className="ic-join-code">{classroom.joinCode}</span>
                </div>
                <div className="ic-meta-item">
                  <label>Students</label>
                  <span>{classroom.studentCount}</span>
                </div>
              </div>
              <button className="ic-enter-lessons-btn" onClick={handleEnterLessons}>
                Enter lessons
              </button>
              {classroom.description && (
                <p className="ic-description">{classroom.description}</p>
              )}
            </div>

            <section className="ic-section">
              <div className="ic-section-header">
                <h2 className="ic-section-title">Students</h2>
                <button
                  type="button"
                  className="ic-add-btn"
                  onClick={() => {
                    setShowAddForm(true)
                    setAddError(null)
                    setAddSuccess(null)
                  }}
                >
                  + Add student
                </button>
              </div>

              {showAddForm && (
                <div className="ic-add-form">
                  <button
                    type="button"
                    className="ic-add-form-close"
                    onClick={() => setShowAddForm(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <div className="ic-add-form-title">Add a student seat</div>
                  <div className="ic-add-form-sub">
                    A student key will be generated automatically
                  </div>

                  <label htmlFor="ic-first-name">First name</label>
                  <input
                    id="ic-first-name"
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                  />

                  <label htmlFor="ic-last-name">Last name</label>
                  <input
                    id="ic-last-name"
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                  />

                  <button
                    type="button"
                    className="ic-add-form-submit"
                    onClick={handleAddSubmit}
                    disabled={addSubmitting}
                  >
                    Add student
                  </button>
                  {addError && <div className="ic-form-error">{addError}</div>}
                  {addSuccess && (
                    <div className="ic-form-success">{addSuccess}</div>
                  )}
                </div>
              )}

              {students.length === 0 ? (
                <div className="ic-empty-state">
                  No students yet. Use Add student to create seats.
                </div>
              ) : (
                <table className="ic-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Student key</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Progress</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.membershipId}>
                        <td>
                          {student.firstName} {student.lastName}
                        </td>
                        <td>
                          {student.claimed && student.username ? (
                            student.username
                          ) : (
                            <span className="ic-muted">-</span>
                          )}
                        </td>
                        <td className="ic-key-cell">{student.studentKey}</td>
                        <td>
                          {student.claimed ? (
                            <span className="ic-status-pill registered">
                              Registered
                            </span>
                          ) : (
                            <span className="ic-status-pill pending">
                              Pending
                            </span>
                          )}
                        </td>
                        <td>
                          {student.claimed ? (
                            formatDate(student.joinedAt)
                          ) : (
                            <span className="ic-muted">-</span>
                          )}
                        </td>
                        <td>{progressFor(student)}</td>
                        <td>
                          {student.claimed && (
                            <button
                              type="button"
                              className="ic-impersonate-btn"
                              onClick={() => handleImpersonate(student)}
                            >
                              Impersonate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="ic-section">
              <div className="ic-section-header">
                <h2 className="ic-section-title">Instructors</h2>
                <button
                  type="button"
                  className="ic-add-btn"
                  onClick={() => {
                    setShowAddAdminForm(true)
                    setAddAdminSuccess(null)
                    setAddAdminError(null)
                  }}
                >
                  + Add instructor
                </button>
              </div>

              {showAddAdminForm && (
                <div className="ic-add-form">
                  <button
                    type="button"
                    className="ic-add-form-close"
                    onClick={() => {
                      setShowAddAdminForm(false)
                      setAddAdminSuccess(null)
                      setAddAdminError(null)
                    }}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <div className="ic-add-form-title">Add an instructor</div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text3)',
                      marginBottom: '20px',
                    }}
                  >
                    An admin key will be generated. Share it along with the classroom join code.
                  </p>

                  <label htmlFor="ic-admin-first-name">First name</label>
                  <input
                    id="ic-admin-first-name"
                    type="text"
                    value={newAdminFirstName}
                    onChange={(e) => setNewAdminFirstName(e.target.value)}
                    placeholder="First name"
                  />

                  <label htmlFor="ic-admin-last-name">Last name</label>
                  <input
                    id="ic-admin-last-name"
                    type="text"
                    value={newAdminLastName}
                    onChange={(e) => setNewAdminLastName(e.target.value)}
                    placeholder="Last name"
                  />

                  <button
                    type="button"
                    className="ic-add-btn"
                    style={{ width: '100%', marginTop: '4px' }}
                    onClick={handleAddAdmin}
                  >
                    Add instructor
                  </button>
                  {addAdminError !== null && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--red)',
                        marginTop: '8px',
                      }}
                    >
                      {addAdminError}
                    </p>
                  )}
                  {addAdminSuccess !== null && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--green)',
                        marginTop: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {addAdminSuccess}
                    </p>
                  )}
                </div>
              )}

              {admins.length === 0 ? (
                <div className="ic-empty-state">
                  No instructors yet. Use Add instructor to create seats.
                </div>
              ) : (
                <table className="ic-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Admin key</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.membershipId}>
                        <td>
                          {admin.claimed && (admin.firstName || admin.lastName) ? (
                            `${admin.firstName ?? ''} ${admin.lastName ?? ''}`.trim()
                          ) : (
                            <span className="ic-muted">(pending)</span>
                          )}
                        </td>
                        <td>
                          {admin.claimed && admin.username ? (
                            admin.username
                          ) : (
                            <span className="ic-muted">-</span>
                          )}
                        </td>
                        <td className="ic-key-cell">{admin.adminKey}</td>
                        <td>
                          {admin.isOwner ? (
                            <span className="ic-status-pill registered">Owner</span>
                          ) : (
                            <span className="ic-status-pill pending">Admin</span>
                          )}
                        </td>
                        <td>
                          {admin.claimed ? (
                            <span className="ic-status-pill registered">Registered</span>
                          ) : (
                            <span className="ic-status-pill pending">Pending</span>
                          )}
                        </td>
                        <td>
                          {admin.claimed ? (
                            formatDate(admin.joinedAt)
                          ) : (
                            <span className="ic-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}
