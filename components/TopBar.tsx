type TopBarProps = {
  session: string
  completedCount: number
  totalCount: number
}

export function TopBar({ session, completedCount, totalCount }: TopBarProps) {
  return (
    <header className="topbar">
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
