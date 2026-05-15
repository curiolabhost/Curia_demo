'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import './login.css'

type Role = 'student' | 'instructor'
type Tab = 'signin' | 'register'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleParam = searchParams.get('role')
  const initialRole: Role = roleParam === 'instructor' ? 'instructor' : 'student'

  const [role, setRole] = useState<Role>(initialRole)
  const [activeTab, setActiveTab] = useState<Tab>('signin')

  const handleSubmit = () => {
    router.push(role === 'student' ? '/student/home' : '/instructor/home')
  }

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
                  <input className="login-input" type="text" placeholder="your-username" />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder={'••••••••'}
                  />
                </div>
                <button type="button" className="login-submit" onClick={handleSubmit}>
                  Sign in
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
                    />
                  </div>
                  <div>
                    <label className="login-label">Last name</label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder={role === 'student' ? 'Anderson' : 'Whitfield'}
                    />
                  </div>
                </div>
                <div className="login-field">
                  <label className="login-label">Username</label>
                  <input className="login-input" type="text" placeholder="your-username" />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder={'••••••••'}
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
                    />
                  </div>
                )}

                <button type="button" className="login-submit" onClick={handleSubmit}>
                  Create account
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
