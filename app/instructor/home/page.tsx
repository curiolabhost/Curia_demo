'use client'

import { useState } from 'react'
import './instructor-home.css'

const placeholderUser = { firstName: 'Jamie', lastName: 'Vasquez' }

const placeholderOwnedClassrooms = [
  { id: '1', name: 'Intro to Programming', subject: 'JavaScript', studentCount: 18, joinCode: 'SUMR-25' },
  { id: '2', name: 'HTML and CSS Foundations', subject: 'Web Development', studentCount: 12, joinCode: 'HTML-F1' },
]

const placeholderJoinedClassrooms = [
  { id: '3', name: 'Advanced JavaScript', subject: 'JavaScript', studentCount: 9, joinCode: 'ADV-J1' },
]

type Classroom = (typeof placeholderOwnedClassrooms)[number]

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

function ClassroomCard({ classroom }: { classroom: Classroom }) {
  return (
    <div
      className="ih-card"
      onClick={() => console.log('open classroom', classroom.id)}
    >
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
}: {
  title: string
  classrooms: Classroom[]
  emptyText: string
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
            <ClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function InstructorHomePage() {
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [adminKey, setAdminKey] = useState('')

  const initials = `${placeholderUser.firstName.charAt(0)}${placeholderUser.lastName.charAt(0)}`

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
              onClick={() => setShowJoinForm(true)}
            >
              Join a classroom
            </button>
            <button type="button" className="ih-create-btn">
              Create classroom
            </button>
          </div>
        </div>

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

            <button type="button" className="ih-join-submit">
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
              Both codes come from the classroom owner.
            </div>
          </div>
        )}

        <ClassroomSection
          title="My classrooms"
          classrooms={placeholderOwnedClassrooms}
          emptyText="You have not created any classrooms yet."
        />

        <ClassroomSection
          title="Joined classrooms"
          classrooms={placeholderJoinedClassrooms}
          emptyText="You have not joined any classrooms as an admin yet."
        />
      </main>
    </div>
  )
}
