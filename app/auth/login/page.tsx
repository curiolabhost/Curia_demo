'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import './login.css'

type Role = 'student' | 'instructor'
type Tab = 'signin' | 'register'

function redirectPathForApiRole(apiRole: string): string {
  return apiRole === 'ADMIN' ? '/instructor/home' : '/student/home'
}

const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Please fill in all required fields.',
  invalid_role: 'Invalid role selected.',
  invalid_username: 'Username must be 3-20 characters: letters, numbers, or underscores.',
  invalid_password: 'Password must be at least 8 characters.',
  username_taken: 'That username is already taken.',
  server_error: 'Something went wrong. Please try again.',
  register_failed: 'Could not create account. Please try again.',
  network_error: 'Network error. Please check your connection.',
}

function registerErrorMessage(code: string | null | undefined): string {
  if (!code) return REGISTER_ERROR_MESSAGES.register_failed
  return REGISTER_ERROR_MESSAGES[code] ?? REGISTER_ERROR_MESSAGES.register_failed
}

function LoginInner() {
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole: Role = roleParam === 'instructor' ? 'instructor' : 'student'

  const [role, setRole] = useState<Role>(initialRole)
  const [activeTab, setActiveTab] = useState<Tab>('signin')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [classroomKey, setClassroomKey] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const otherRole: Role = role === 'student' ? 'instructor' : 'student'
  const switcherHref = `/auth/login?role=${otherRole}`

  const cardTitle = activeTab === 'signin' ? 'Welcome back' : 'Create your account'
  const cardSub =
    activeTab === 'signin'
      ? role === 'student'
        ? 'Sign in to continue to your classroom'
        : 'Sign in to manage your classrooms'
      : role === 'student'
        ? 'Join your classroom and start learning'
        : 'Set up your instructor account'

  const rolePillText = role === 'student' ? 'Joining as student' : 'Joining as instructor'

  async function handleSignIn() {
    if (submitting) return
    setErrorMsg(null)
    setSubmitting(true)
    try {
      console.log('[login] attempting sign in', { username, role })
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      console.log('[login] response status', res.status)
      const data = await res.json()
      console.log('[login] response body', data)

      if (res.ok && data.ok) {
        const redirectPath = redirectPathForApiRole(data.role)
        console.log('[login] redirecting to', redirectPath)
        window.location.href = redirectPath
        return
      }

      console.log('[login] error', data.error)
      setErrorMsg(data.error ?? 'sign_in_failed')
    } catch (err) {
      console.log('[login] error', err)
      setErrorMsg('network_error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister() {
    if (submitting) return
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const apiRole: 'STUDENT' | 'ADMIN' = role === 'instructor' ? 'ADMIN' : 'STUDENT'
      console.log('[register] attempting register', { firstName, lastName, username, role })
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, username, password, role: apiRole }),
      })
      console.log('[register] response status', res.status)
      const data = await res.json()
      console.log('[register] response body', data)

      if (res.ok && data.ok) {
        const redirectPath = redirectPathForApiRole(data.role)
        console.log('[register] redirecting to', redirectPath)
        window.location.href = redirectPath
        return
      }

      console.log('[register] error', data.error)
      setErrorMsg(registerErrorMessage(data.error))
    } catch (err) {
      console.log('[register] error', err)
      setErrorMsg(registerErrorMessage('network_error'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page grid-bg">
      <nav className="lnav">
        <a href="/" className="logo">
          Cu<em>r</em>ia
        </a>
        <a href="/" className="nav-back">
          {'←'} Back to home
        </a>
      </nav>

      <div className="login-center">
        <div className="sq sq-teal sq-md" style={{ top: 60, left: '8%' }}>{'{}'}</div>
        <div className="sq sq-navy sq-sm" style={{ top: 100, left: '22%' }}></div>
        <div className="sq sq-cyan sq-md" style={{ top: 50, right: '10%' }}>{'<>'}</div>
        <div className="sq sq-purple sq-sm" style={{ top: 130, right: '22%' }}></div>
        <div className="sq sq-teal sq-sm" style={{ bottom: 120, left: '12%' }}></div>
        <div className="sq sq-navy sq-sm" style={{ bottom: 100, right: '15%' }}></div>

        <div className="auth-panels">
          <div className="role-panel">
            <div className="role-panel-label">I am joining as</div>

            <button
              type="button"
              className={'role-btn' + (role === 'student' ? ' active' : '')}
              onClick={() => setRole('student')}
            >
              <div className="role-btn-ico">{'\u{1F393}'}</div>
              <div className="role-btn-label">Student</div>
              <div className="role-btn-sub">Join a classroom with your student key</div>
            </button>

            <button
              type="button"
              className={'role-btn' + (role === 'instructor' ? ' active' : '')}
              onClick={() => setRole('instructor')}
            >
              <div className="role-btn-ico">{'\u{1F4DA}'}</div>
              <div className="role-btn-label">Instructor</div>
              <div className="role-btn-sub">Manage classrooms and track progress</div>
            </button>
          </div>

          <div className="login-card">
            <div className={'role-pill' + (role === 'instructor' ? ' instructor' : '')}>
              {rolePillText}
            </div>

            <div className="card-title">{cardTitle}</div>
            <div className="card-sub">{cardSub}</div>

            <div className="login-tab-bar">
              <button
                type="button"
                className={'login-tab' + (activeTab === 'signin' ? ' active' : '')}
                onClick={() => setActiveTab('signin')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={'login-tab' + (activeTab === 'register' ? ' active' : '')}
                onClick={() => setActiveTab('register')}
              >
                Create account
              </button>
            </div>

            {activeTab === 'signin' ? (
              <div className="tab-content">
                <div className="login-field">
                  <label className="login-label">Username</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="your-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder={'••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {errorMsg && <div className="login-error">{errorMsg}</div>}
                <button
                  type="button"
                  className="login-submit"
                  onClick={handleSignIn}
                  disabled={submitting}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            ) : (
              <div className="tab-content">
                <div className="name-row login-field">
                  <div>
                    <label className="login-label">First name</label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder={role === 'student' ? 'Maya' : 'Jordan'}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="login-label">Last name</label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder={role === 'student' ? 'Anderson' : 'Whitfield'}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="login-field">
                  <label className="login-label">Username</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="your-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder={'••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                {role === 'student' && (
                  <div className="login-field">
                    <label className="login-label">
                      Classroom key{' '}
                      <span className="login-label-hint">(optional)</span>
                    </label>
                    <input
                      className="login-input login-input-mono"
                      type="text"
                      placeholder="cls-azure-fox-291"
                      value={classroomKey}
                      onChange={(e) => setClassroomKey(e.target.value)}
                    />
                  </div>
                )}

                {errorMsg && <div className="login-error">{errorMsg}</div>}
                <button
                  type="button"
                  className="login-submit"
                  onClick={handleRegister}
                  disabled={submitting}
                >
                  {submitting ? 'Creating account…' : 'Create account'}
                </button>
              </div>
            )}

            <div className="login-role-switch">
              {role === 'student' ? 'Are you an instructor?' : 'Looking to join as a student?'}{' '}
              <a href={switcherHref}>
                {'→'} Sign in as {otherRole}
              </a>
            </div>
          </div>
        </div>
      </div>

      <footer className="login-footer">2025 Curia. Built for learners.</footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
