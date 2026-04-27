type TopBarProps = {
  session: string
  completedCount: number
  totalCount: number
  onMenuClick?: () => void
}

export function TopBar({ session, completedCount, totalCount, onMenuClick }: TopBarProps) {
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
      {session ? <span className="session-label">{session}</span> : null}
      <span className="completion-badge">
        {completedCount} / {totalCount} complete
      </span>
    </header>
  )
}
