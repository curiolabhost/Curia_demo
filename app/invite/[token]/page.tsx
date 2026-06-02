'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import '../../auth/login/login.css'

type InviteInfo = {
  role: 'STUDENT' | 'ADMIN'
  classroomName: string
  firstName: string | null
  claimed: boolean
}

type Me = {
  userId: string
  firstName: string
  role: 'STUDENT' | 'ADMIN'
} | null

type AuthTab = 'signin' | 'register'

const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: 'Please fill in all required fields.',
  invalid_username: 'Username must be 3-20 characters: letters, numbers, or underscores.',
  invalid_password: 'Password must be at least 8 characters.',
  username_taken: 'That username is already taken.',
  invalid_key: "That key doesn't match this invite. Check the key in your email.",
  key_already_used: 'This seat has already been claimed.',
  already_member: "You're already a member of this classroom.",
  role_mismatch: 'This invite is for a different role than your account.',
  invite_not_found: 'This invite link is invalid or has been revoked.',
  server_error: 'Something went wrong. Please try again.',
  network_error: 'Network error. Please check your connection.',
}

function msg(code: string | null | undefined): string {
  if (!code) return ERROR_MESSAGES.server_error
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.server_error
}

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [me, setMe] = useState<Me>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [authTab, setAuthTab] = useState<AuthTab>('register')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [key, setKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const roleLabel = invite?.role === 'ADMIN' ? 'instructor' : 'student'

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      if (!res.ok) {
        setMe(null)
        return
      }
      const data = await res.json()
      setMe({ userId: data.userId, firstName: data.firstName, role: data.role })
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await fetch(`/api/invite/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok || !data.ok) {
          setLoadError(msg(data?.error))
          return
        }
        setInvite({
          role: data.role,
          classroomName: data.classroomName,
          firstName: data.firstName,
          claimed: data.claimed,
        })
        if (data.firstName) setFirstName(data.firstName)
        await refreshMe()
      } catch {
        if (!cancelled) setLoadError(ERROR_MESSAGES.network_error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [token, refreshMe])

  async function handleSignIn() {
    if (submitting) return
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        await refreshMe()
        return
      }
      setErrorMsg(msg(data.error))
    } catch {
      setErrorMsg(ERROR_MESSAGES.network_error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister() {
    if (submitting || !invite) return
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          username,
          password,
          role: invite.role,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        await refreshMe()
        return
      }
      setErrorMsg(msg(data.error))
    } catch {
      setErrorMsg(ERROR_MESSAGES.network_error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAccept() {
    if (submitting) return
    if (!key.trim()) {
      setErrorMsg('Please enter your join key.')
      return
    }
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, key: key.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        window.location.href = data.redirectTo ?? '/'
        return
      }
      setErrorMsg(msg(data.error))
    } catch {
      setErrorMsg(ERROR_MESSAGES.network_error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setMe(null)
    setErrorMsg(null)
  }

  const authed = me !== null
  const roleMatches = !me || !invite || me.role === invite.role

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
        <div className="auth-panels" style={{ justifyContent: 'center' }}>
          <div className="login-card">
            {loading ? (
              <div className="card-sub">Loading your invite…</div>
            ) : loadError ? (
              <>
                <div className="card-title">Invite unavailable</div>
                <div className="login-error">{loadError}</div>
              </>
            ) : invite ? (
              <>
                <div className={'role-pill' + (invite.role === 'ADMIN' ? ' instructor' : '')}>
                  Invited as {roleLabel}
                </div>
                <div className="card-title">
                  Join {invite.classroomName}
                </div>
                <div className="card-sub">
                  {invite.firstName ? `Hi ${invite.firstName}! ` : ''}
                  You&apos;ve been invited to join <strong>{invite.classroomName}</strong> as a{' '}
                  {roleLabel}.
                </div>

                {invite.claimed ? (
                  <div className="login-error" style={{ marginTop: 16 }}>
                    This seat has already been claimed. If that wasn&apos;t you, contact your
                    instructor.
                  </div>
                ) : !authed ? (
                  <>
                    <div className="login-tab-bar">
                      <button
                        type="button"
                        className={'login-tab' + (authTab === 'signin' ? ' active' : '')}
                        onClick={() => {
                          setAuthTab('signin')
                          setErrorMsg(null)
                        }}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        className={'login-tab' + (authTab === 'register' ? ' active' : '')}
                        onClick={() => {
                          setAuthTab('register')
                          setErrorMsg(null)
                        }}
                      >
                        Create account
                      </button>
                    </div>

                    {authTab === 'register' && (
                      <div className="name-row login-field">
                        <div>
                          <label className="login-label">First name</label>
                          <input
                            className="login-input"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="login-label">Last name</label>
                          <input
                            className="login-input"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

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
                      onClick={authTab === 'signin' ? handleSignIn : handleRegister}
                      disabled={submitting}
                    >
                      {submitting
                        ? 'Working…'
                        : authTab === 'signin'
                          ? 'Sign in'
                          : 'Create account'}
                    </button>
                  </>
                ) : !roleMatches ? (
                  <>
                    <div className="login-error" style={{ marginTop: 16 }}>
                      You&apos;re signed in as a {me?.role === 'ADMIN' ? 'instructor' : 'student'},
                      but this invite is for a {roleLabel}. Sign out and use a {roleLabel} account.
                    </div>
                    <button type="button" className="login-submit" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="card-sub" style={{ marginTop: 8 }}>
                      Signed in as <strong>{me?.firstName}</strong>. Enter the join key from your
                      invite email to confirm your spot.
                    </div>
                    <div className="login-field">
                      <label className="login-label">Join key</label>
                      <input
                        className="login-input login-input-mono"
                        type="text"
                        placeholder="ABC123"
                        value={key}
                        autoCapitalize="characters"
                        onChange={(e) => setKey(e.target.value)}
                      />
                    </div>
                    {errorMsg && <div className="login-error">{errorMsg}</div>}
                    <button
                      type="button"
                      className="login-submit"
                      onClick={handleAccept}
                      disabled={submitting}
                    >
                      {submitting ? 'Joining…' : `Join ${invite.classroomName}`}
                    </button>
                    <div className="login-role-switch">
                      Not {me?.firstName}?{' '}
                      <a href="#" onClick={(e) => { e.preventDefault(); void handleSignOut() }}>
                        Sign out
                      </a>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      <footer className="login-footer">2025 Luminent. Built for learners.</footer>
    </div>
  )
}
