type TopBarProps = {
  session: string
  completedCount: number
  totalCount: number
  onMenuClick?: () => void
  device?: string
}

export function TopBar({ session, completedCount, totalCount, onMenuClick, device }: TopBarProps) {
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
      {process.env.NODE_ENV !== 'production' && device ? (
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
      <span className="completion-badge">
        {completedCount} / {totalCount} complete
      </span>
    </header>
  )
}
