'use client'

import { useEffect, useRef } from 'react'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type { BlankInputMode, FinalProjectBlank } from '@/lib/lessons'

type BlankDetailPanelProps = {
  blockIdx: number
  blank: FinalProjectBlank
  anchorRect: { left: number; top: number; bottom: number; right: number }
  actions: EditActions
  onClose: () => void
}

const PANEL_WIDTH = 280

export function BlankDetailPanel({
  blockIdx,
  blank,
  anchorRect,
  actions,
  onClose,
}: BlankDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Node)) return
      if (panelRef.current && panelRef.current.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', onMouse)
    return () => document.removeEventListener('mousedown', onMouse)
  }, [onClose])

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.min(
    Math.max(8, anchorRect.left),
    viewportWidth - PANEL_WIDTH - 8,
  )
  const top = Math.min(anchorRect.bottom + 6, viewportHeight - 100)

  const update = (partial: Partial<FinalProjectBlank>) => {
    actions.blanks.update(blockIdx, blank.id, partial)
  }

  const setMode = (mode: BlankInputMode) => {
    update({ mode })
  }

  return (
    <>
      <div className="admin-blank-panel-backdrop" />
      <div
        ref={panelRef}
        className="admin-blank-panel"
        style={{ left, top, width: PANEL_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="admin-blank-panel-header">
          <span className="admin-blank-panel-title">Blank</span>
          <span className="admin-blank-panel-id">{blank.id}</span>
          <button
            type="button"
            className="admin-blank-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="admin-blank-panel-body">
          <div>
            <label className="admin-field-label">Mode</label>
            <div className="admin-mode-radio-row">
              {(['wordbank', 'type', 'freeline'] as BlankInputMode[]).map(
                (m) => (
                  <button
                    key={m}
                    type="button"
                    className={`admin-mode-radio${blank.mode === m ? ' selected' : ''}`}
                    onClick={() => setMode(m)}
                  >
                    {m}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="admin-field-label">Answer</label>
            <input
              className="admin-field-input"
              value={blank.answer ?? ''}
              onChange={(e) => update({ answer: e.target.value })}
            />
          </div>
        </div>
      </div>
    </>
  )
}
