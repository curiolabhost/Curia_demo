'use client'

import type { SaveState } from '@/lib/admin/useLessonDraft'

type AdminTopBarProps = {
  lessonId: string
  dirty: boolean
  saveState: SaveState
  saveError: string | null
  onSave: () => void
}

export function AdminTopBar({
  lessonId,
  dirty,
  saveState,
  saveError,
  onSave,
}: AdminTopBarProps) {
  const disabled = !dirty || saveState === 'saving'

  let status: React.ReactNode = null
  if (saveState === 'saving') {
    status = (
      <span className="admin-top-bar-save-status">Saving...</span>
    )
  } else if (saveState === 'saved') {
    status = (
      <span className="admin-top-bar-save-status ok">Saved</span>
    )
  } else if (saveState === 'error') {
    status = (
      <span className="admin-top-bar-save-status err">
        Save failed: {saveError ?? 'unknown error'}
      </span>
    )
  }

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
      <span className="admin-top-bar-save">
        {status}
        <button
          type="button"
          className="admin-top-bar-save-btn"
          disabled={disabled}
          onClick={onSave}
        >
          {saveState === 'saving' ? 'Saving...' : 'Save'}
        </button>
      </span>
    </div>
  )
}
