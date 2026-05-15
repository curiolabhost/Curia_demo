'use client'

import { useState } from 'react'
import './student-home.css'

const placeholderClassrooms = [
  { id: '1', name: 'Intro to Programming', subject: 'JavaScript', joinedAt: 'January 15, 2025' },
  { id: '2', name: 'HTML and CSS Foundations', subject: 'Web Development', joinedAt: 'March 2, 2025' },
  { id: '3', name: 'Advanced JavaScript', subject: 'JavaScript', joinedAt: 'February 10, 2025' },
]

const placeholderUser = { firstName: 'Ana', lastName: 'Torres' }

export default function StudentHomePage() {
  const [classrooms] = useState(placeholderClassrooms)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [studentKey, setStudentKey] = useState('')

  const initials = `${placeholderUser.firstName.charAt(0)}${placeholderUser.lastName.charAt(0)}`

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

            <button type="button" className="sh-join-submit">
              Join classroom
            </button>
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

        {classrooms.length === 0 ? (
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
                key={classroom.id}
                className="sh-card"
                onClick={() => console.log('open classroom', classroom.id)}
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
                  Joined {classroom.joinedAt}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
