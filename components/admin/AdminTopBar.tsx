'use client'

type AdminTopBarProps = {
  lessonId: string
  dirty: boolean
}

export function AdminTopBar({ lessonId, dirty }: AdminTopBarProps) {
  return (
    <div className="admin-top-bar">
      <span className="admin-top-bar-badge">Admin Edit</span>
      <span className="admin-top-bar-id">{lessonId}</span>
      {dirty ? (
        <span className="admin-top-bar-dirty">Unsaved changes</span>
      ) : null}
      <span className="admin-top-bar-spacer" />
      <a
        className="admin-top-bar-link"
        href={`/learn/${lessonId}`}
        target="_blank"
        rel="noreferrer"
      >
        View student lesson ↗
      </a>
    </div>
  )
}
