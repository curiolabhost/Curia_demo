'use client'

import type { SaveState } from '@/lib/admin/useLessonDraft'

type AdminSaveBarProps = {
  dirty: boolean
  saveState: SaveState
  saveError: string | null
  onSave: () => void
}

export function AdminSaveBar({
  dirty,
  saveState,
  saveError,
  onSave,
}: AdminSaveBarProps) {
  const disabled = !dirty || saveState === 'saving'

  let status: React.ReactNode = null
  if (saveState === 'saving') {
    status = <span className="admin-save-status">Saving...</span>
  } else if (saveState === 'saved') {
    status = <span className="admin-save-status ok">Saved ✓</span>
  } else if (saveState === 'error') {
    status = (
      <span className="admin-save-status err">
        Save failed: {saveError ?? 'unknown error'}
      </span>
    )
  }

  return (
    <div className="admin-save-bar">
      {status}
      <button
        type="button"
        className="admin-save-btn"
        disabled={disabled}
        onClick={onSave}
      >
        {saveState === 'saving' ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
