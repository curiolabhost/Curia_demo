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
  email: string | null
  inviteStatus: string
  inviteSentAt: string | null
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
  email: string | null
  inviteStatus: string
  inviteSentAt: string | null
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

function formatDateTime(value: string | null): string {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
  const [newEmail, setNewEmail] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)

  const [admins, setAdmins] = useState<Admin[]>([])
  const [showAddAdminForm, setShowAddAdminForm] = useState(false)
  const [newAdminFirstName, setNewAdminFirstName] = useState('')
  const [newAdminLastName, setNewAdminLastName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [addAdminSuccess, setAddAdminSuccess] = useState<string | null>(null)

  const [resendBusy, setResendBusy] = useState<string | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)

  // Invite draft preview shown before anything is actually emailed.
  const [preview, setPreview] = useState<{
    membershipId: string
    role: 'STUDENT' | 'ADMIN'
    to: string
    subject: string
    html: string
    link: string
  } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

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
    if (code === 'invalid_email') return 'Please enter a valid email address.'
    if (code === 'forbidden') return 'You do not have permission.'
    return 'Something went wrong.'
  }

  async function handleAddSubmit() {
    setAddError(null)
    setAddSuccess(null)
    setAddSubmitting(true)
    try {
      const email = newEmail.trim()
      const res = await fetch('/api/classroom/add-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          firstName: newFirstName,
          lastName: newLastName,
          email: email || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setAddError(mapAddError(data?.error ?? ''))
        return
      }
      setAddSuccess(
        email
          ? `Seat created (key: ${data.studentKey}). Review the invite draft, then send.`
          : `Seat created. Their key is: ${data.studentKey}`
      )
      setNewFirstName('')
      setNewLastName('')
      setNewEmail('')
      const list = await fetchStudents()
      setStudents(list)
      // Open the draft preview instead of sending automatically.
      if (email && data.membershipId) {
        void openInvitePreview(data.membershipId, 'STUDENT', email)
      }
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
      const email = newAdminEmail.trim()
      const res = await fetch('/api/classroom/add-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId,
          firstName: newAdminFirstName.trim(),
          lastName: newAdminLastName.trim(),
          email: email || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setAddAdminSuccess(
          email
            ? `Seat created (key: ${data.adminKey}). Review the invite draft, then send.`
            : `Seat created. Their key is: ${data.adminKey}`
        )
        setNewAdminFirstName('')
        setNewAdminLastName('')
        setNewAdminEmail('')
        try {
          const list = await fetchAdmins()
          setAdmins(list)
        } catch {
          // ignore refresh failure
        }
        if (email && data.membershipId) {
          void openInvitePreview(data.membershipId, 'ADMIN', email)
        }
      } else {
        const errorMap: Record<string, string> = {
          missing_fields: 'Please fill in both names.',
          invalid_email: 'Please enter a valid email address.',
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

  const previewErrorMap: Record<string, string> = {
    no_email: 'No email on file — enter one to send.',
    already_claimed: 'This seat has already been claimed.',
    forbidden: 'You do not have permission.',
    not_owner: 'Only the owner can invite instructors.',
    invalid_email: 'Please enter a valid email address.',
  }

  // Fetch the rendered draft and open the preview modal. Nothing is sent here.
  async function openInvitePreview(
    membershipId: string,
    role: 'STUDENT' | 'ADMIN',
    existingEmail: string | null
  ) {
    setResendNotice(null)
    setPreviewError(null)
    let email = existingEmail
    if (!email) {
      const entered = window.prompt('Email address to send this invite to:')
      if (!entered) return
      email = entered.trim()
    }
    setResendBusy(membershipId)
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/classroom/invite/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, role, email }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setPreview({
          membershipId,
          role,
          to: data.to,
          subject: data.subject,
          html: data.html,
          link: data.link,
        })
      } else {
        setResendNotice(previewErrorMap[data.error] ?? 'Could not build the invite preview.')
      }
    } catch {
      setResendNotice('Could not build the invite preview.')
    } finally {
      setResendBusy(null)
      setPreviewLoading(false)
    }
  }

  // Confirm-and-send from the preview modal.
  async function handleConfirmSend() {
    if (!preview || sending) return
    setSending(true)
    setPreviewError(null)
    try {
      const res = await fetch('/api/classroom/invite/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: preview.membershipId,
          role: preview.role,
          email: preview.to,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setResendNotice(`Invite sent to ${data.email}.`)
        setPreview(null)
        try {
          if (preview.role === 'STUDENT') setStudents(await fetchStudents())
          else setAdmins(await fetchAdmins())
        } catch {
          // ignore refresh failure
        }
      } else if (data.error === 'email_send_failed') {
        setPreviewError(`Email provider rejected the send: ${data.detail ?? 'unknown error'}`)
      } else if (data.error === 'email_not_configured') {
        setPreviewError("Email isn't configured yet on the server.")
      } else {
        setPreviewError(previewErrorMap[data.error] ?? 'Could not send invite.')
      }
    } catch {
      setPreviewError('Could not send invite.')
    } finally {
      setSending(false)
    }
  }

  function inviteStatusLabel(claimed: boolean, status: string): string {
    if (claimed) return 'Registered'
    if (status === 'sent') return 'Invited'
    return 'Pending'
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

            {resendNotice && (
              <div className="ic-form-success" style={{ marginBottom: 16 }}>
                {resendNotice}
              </div>
            )}

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
                    A student key will be generated automatically. Add an email to send an
                    invite — the student enters the key to confirm.
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

                  <label htmlFor="ic-email">Email (optional)</label>
                  <input
                    id="ic-email"
                    type="email"
                    placeholder="student@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />

                  <button
                    type="button"
                    className="ic-add-form-submit"
                    onClick={handleAddSubmit}
                    disabled={addSubmitting}
                  >
                    {newEmail.trim() ? 'Add & preview invite' : 'Add student'}
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
                      <th>Invite</th>
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
                              {inviteStatusLabel(student.claimed, student.inviteStatus)}
                            </span>
                          )}
                        </td>
                        <td>
                          {student.claimed ? (
                            <span className="ic-muted">-</span>
                          ) : (
                            <div className="ic-invite-cell">
                              {student.inviteStatus === 'sent' && (
                                <div className="ic-invite-meta">
                                  Sent to {student.email ?? '—'}
                                  <br />
                                  {formatDateTime(student.inviteSentAt)}
                                </div>
                              )}
                              <button
                                type="button"
                                className="ic-impersonate-btn"
                                disabled={resendBusy === student.membershipId}
                                onClick={() =>
                                  openInvitePreview(
                                    student.membershipId,
                                    'STUDENT',
                                    student.email
                                  )
                                }
                              >
                                {resendBusy === student.membershipId
                                  ? 'Loading…'
                                  : student.inviteStatus === 'sent'
                                    ? 'Preview & resend'
                                    : 'Preview & send'}
                              </button>
                            </div>
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
                    An admin key will be generated. Add an email to send an invite — the
                    instructor enters the key to confirm. Otherwise share the key manually.
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

                  <label htmlFor="ic-admin-email">Email (optional)</label>
                  <input
                    id="ic-admin-email"
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="instructor@example.com"
                  />

                  <button
                    type="button"
                    className="ic-add-btn"
                    style={{ width: '100%', marginTop: '4px' }}
                    onClick={handleAddAdmin}
                  >
                    {newAdminEmail.trim() ? 'Add & preview invite' : 'Add instructor'}
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
                      <th>Invite</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => (
                      <tr key={admin.membershipId}>
                        <td>
                          {admin.firstName || admin.lastName ? (
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
                            <span className="ic-status-pill pending">
                              {inviteStatusLabel(admin.claimed, admin.inviteStatus)}
                            </span>
                          )}
                        </td>
                        <td>
                          {admin.claimed || admin.isOwner ? (
                            <span className="ic-muted">-</span>
                          ) : (
                            <div className="ic-invite-cell">
                              {admin.inviteStatus === 'sent' && (
                                <div className="ic-invite-meta">
                                  Sent to {admin.email ?? '—'}
                                  <br />
                                  {formatDateTime(admin.inviteSentAt)}
                                </div>
                              )}
                              <button
                                type="button"
                                className="ic-impersonate-btn"
                                disabled={resendBusy === admin.membershipId}
                                onClick={() =>
                                  openInvitePreview(admin.membershipId, 'ADMIN', admin.email)
                                }
                              >
                                {resendBusy === admin.membershipId
                                  ? 'Loading…'
                                  : admin.inviteStatus === 'sent'
                                    ? 'Preview & resend'
                                    : 'Preview & send'}
                              </button>
                            </div>
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

      {(preview || previewLoading) && (
        <div
          className="ic-modal-overlay"
          onClick={() => {
            if (!sending) {
              setPreview(null)
              setPreviewError(null)
            }
          }}
        >
          <div className="ic-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ic-modal-header">
              <h3 className="ic-modal-title">Review invite before sending</h3>
              <button
                type="button"
                className="ic-add-form-close"
                aria-label="Close"
                disabled={sending}
                onClick={() => {
                  setPreview(null)
                  setPreviewError(null)
                }}
              >
                ×
              </button>
            </div>

            {previewLoading || !preview ? (
              <div className="ic-empty-state">Building preview…</div>
            ) : (
              <>
                <div className="ic-modal-fields">
                  <div>
                    <label>To</label>
                    <span>{preview.to}</span>
                  </div>
                  <div>
                    <label>Subject</label>
                    <span>{preview.subject}</span>
                  </div>
                  <div>
                    <label>Invite link</label>
                    <span className="ic-modal-link">{preview.link}</span>
                  </div>
                </div>

                <div className="ic-modal-preview-label">Email body</div>
                <iframe
                  className="ic-modal-iframe"
                  title="Invite email preview"
                  sandbox=""
                  srcDoc={preview.html}
                />

                {previewError && <div className="ic-form-error">{previewError}</div>}

                <div className="ic-modal-actions">
                  <button
                    type="button"
                    className="ic-signout-btn"
                    disabled={sending}
                    onClick={() => {
                      setPreview(null)
                      setPreviewError(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ic-add-btn"
                    disabled={sending}
                    onClick={handleConfirmSend}
                  >
                    {sending ? 'Sending…' : `Send to ${preview.to}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
