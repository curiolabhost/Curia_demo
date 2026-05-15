type TopBarProps = {
  session: string
  completedCount: number
  totalCount: number
  onMenuClick?: () => void
  device?: string
  viewMode?: 'normal' | 'slideshow'
  onToggleSlideshow?: () => void
}

export function TopBar({
  session,
  completedCount,
  totalCount,
  onMenuClick,
  device,
  viewMode,
  onToggleSlideshow,
}: TopBarProps) {
  const slideshowActive = viewMode === 'slideshow'
  const showSlideshowToggle = viewMode !== undefined && onToggleSlideshow !== undefined

  return (
    <header className="topbar">
      {onMenuClick ? (
        <button
          type="button"
          className="topbar-menu"
          onClick={onMenuClick}
          aria-label="Toggle lesson nav"
        >
          <span className="topbar-menu-line" />
          <span className="topbar-menu-line" />
          <span className="topbar-menu-line" />
        </button>
      ) : null}
      <span className="logo">
        code<span className="logo-accent">lab</span>
      </span>
      {device ? (
        <span style={{
          background: 'transparent',
          color: 'var(--green)',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          padding: '3px 10px',
          borderRadius: '20px',
          border: '1px solid var(--green)',
          pointerEvents: 'none',
        }}>
          {device}
        </span>
      ) : null}
      {session ? <span className="session-label">{session}</span> : null}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {showSlideshowToggle ? (
          <button
            type="button"
            onClick={onToggleSlideshow}
            aria-label="Slideshow mode"
            aria-pressed={slideshowActive}
            title="Slideshow mode"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              padding: 0,
              border: '1px solid transparent',
              borderRadius: 6,
              background: slideshowActive ? 'var(--accent-dim)' : 'transparent',
              color: slideshowActive ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M10 9l4 3-4 3z" fill="currentColor" stroke="none" />
            </svg>
          </button>
        ) : null}
        <span className="completion-badge" style={{ marginLeft: 0 }}>
          {completedCount} / {totalCount} complete
        </span>
      </div>
    </header>
  )
}
