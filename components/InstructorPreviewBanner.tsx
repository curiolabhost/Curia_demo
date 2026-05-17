'use client'

type InstructorPreviewBannerProps = {
  onExit: () => void
}

export function InstructorPreviewBanner({ onExit }: InstructorPreviewBannerProps) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '36px',
        zIndex: 9999,
        background: 'var(--purple)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontFamily: 'var(--sans)',
      }}
    >
      <span style={{ fontSize: '13px' }}>
        Instructor view -- exercises and progress are saved to your instructor record
      </span>
      <button
        onClick={onExit}
        style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          color: '#fff',
          borderRadius: '4px',
          padding: '4px 12px',
          fontSize: '12px',
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        Exit to dashboard
      </button>
    </div>
  )
}
