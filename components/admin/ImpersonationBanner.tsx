'use client'

import { useState } from 'react'

type ImpersonationBannerProps = {
  studentFirstName: string
  studentLastName: string
  classroomId: string
  onExit: () => void
}

export function ImpersonationBanner({
  studentFirstName,
  studentLastName,
  onExit,
}: ImpersonationBannerProps) {
  const [exiting, setExiting] = useState(false)

  const handleClick = () => {
    if (exiting) return
    setExiting(true)
    onExit()
  }

  return (
    <div
      role="status"
      aria-label="Impersonation banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        zIndex: 9999,
        background: 'var(--orange)',
        color: 'var(--white)',
        fontFamily: 'var(--mono)',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        letterSpacing: '0.02em',
      }}
    >
      <span>
        <span aria-hidden style={{ marginRight: 8 }}>{'\u{1F441}'}</span>
        VIEWING AS {studentFirstName.toUpperCase()} {studentLastName.toUpperCase()}
        <span style={{ margin: '0 8px', opacity: 0.7 }}>{'·'}</span>
        READ ONLY
      </span>
      <button
        type="button"
        onClick={handleClick}
        disabled={exiting}
        style={{
          background: 'var(--white)',
          color: 'var(--orange)',
          border: 'none',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 4,
          cursor: exiting ? 'default' : 'pointer',
          opacity: exiting ? 0.7 : 1,
          letterSpacing: '0.02em',
        }}
      >
        {exiting ? 'Exiting...' : 'Exit Student View'}
      </button>
    </div>
  )
}
