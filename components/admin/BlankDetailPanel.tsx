'use client'

import { useEffect, useRef } from 'react'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type {
  BlankInputMode,
  ExpectedEffect,
  FinalProjectBlank,
} from '@/lib/lessons'

type BlankDetailPanelProps = {
  blockIdx: number
  blank: FinalProjectBlank
  anchorRect: { left: number; top: number; bottom: number; right: number }
  actions: EditActions
  onClose: () => void
}

const PANEL_WIDTH = 360

const EFFECT_TYPES: ExpectedEffect['type'][] = [
  'noError',
  'declaration',
  'assignment',
  'domAssignment',
  'variableValue',
]

function makeDefaultEffect(type: ExpectedEffect['type']): ExpectedEffect {
  switch (type) {
    case 'declaration':
      return { type: 'declaration' }
    case 'assignment':
      return { type: 'assignment' }
    case 'noError':
      return { type: 'noError' }
    case 'domAssignment':
      return { type: 'domAssignment', elementId: '', property: '' }
    case 'variableValue':
      return { type: 'variableValue', name: '', expected: '' }
  }
}

function stringifyValue(v: unknown): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

function parseValue(s: string): unknown {
  const t = s.trim()
  if (t === '') return ''
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  const n = Number(t)
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?$/.test(t)) return n
  try {
    return JSON.parse(t)
  } catch {
    return s
  }
}

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

  const effect: ExpectedEffect | null = blank.expectedEffect ?? null
  const effectType: ExpectedEffect['type'] = effect?.type ?? 'noError'

  const setEffectType = (next: ExpectedEffect['type']) => {
    update({ expectedEffect: makeDefaultEffect(next) })
  }

  const updateEffect = (partial: Partial<ExpectedEffect>) => {
    if (!effect) return
    update({ expectedEffect: { ...effect, ...partial } as ExpectedEffect })
  }

  const refsValue = (blank.lessonRefs ?? []).join(', ')

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

          <div>
            <label className="admin-field-label">Instruction</label>
            <textarea
              className="admin-field-textarea"
              value={blank.instruction ?? ''}
              onChange={(e) =>
                update({
                  instruction: e.target.value.length > 0 ? e.target.value : undefined,
                })
              }
            />
          </div>

          <div>
            <label className="admin-field-label">Explanation</label>
            <textarea
              className="admin-field-textarea"
              value={blank.explanation ?? ''}
              onChange={(e) =>
                update({
                  explanation: e.target.value.length > 0 ? e.target.value : undefined,
                })
              }
            />
          </div>

          <div>
            <label className="admin-field-label">Lesson refs (comma-separated)</label>
            <input
              className="admin-field-input"
              value={refsValue}
              onChange={(e) => {
                const refs = e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
                update({ lessonRefs: refs.length > 0 ? refs : undefined })
              }}
            />
          </div>

          {blank.mode === 'freeline' ? (
            <div>
              <label className="admin-field-label">Expected effect</label>
              <select
                className="admin-field-select"
                value={effectType}
                onChange={(e) =>
                  setEffectType(e.target.value as ExpectedEffect['type'])
                }
              >
                {EFFECT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {effect?.type === 'declaration' || effect?.type === 'assignment' ? (
                <>
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    valueType (optional)
                  </label>
                  <input
                    className="admin-field-input"
                    value={effect.valueType ?? ''}
                    onChange={(e) =>
                      updateEffect({
                        valueType:
                          e.target.value.length > 0 ? e.target.value : undefined,
                      })
                    }
                  />
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    value (optional)
                  </label>
                  <input
                    className="admin-field-input"
                    value={stringifyValue(effect.value)}
                    onChange={(e) =>
                      updateEffect({
                        value:
                          e.target.value.length > 0
                            ? parseValue(e.target.value)
                            : undefined,
                      })
                    }
                  />
                </>
              ) : null}

              {effect?.type === 'domAssignment' ? (
                <>
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    elementId
                  </label>
                  <input
                    className="admin-field-input"
                    value={effect.elementId}
                    onChange={(e) =>
                      updateEffect({ elementId: e.target.value })
                    }
                  />
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    property
                  </label>
                  <input
                    className="admin-field-input"
                    value={effect.property}
                    onChange={(e) => updateEffect({ property: e.target.value })}
                  />
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    valueType (optional)
                  </label>
                  <input
                    className="admin-field-input"
                    value={effect.valueType ?? ''}
                    onChange={(e) =>
                      updateEffect({
                        valueType:
                          e.target.value.length > 0 ? e.target.value : undefined,
                      })
                    }
                  />
                </>
              ) : null}

              {effect?.type === 'variableValue' ? (
                <>
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    name
                  </label>
                  <input
                    className="admin-field-input"
                    value={effect.name}
                    onChange={(e) => updateEffect({ name: e.target.value })}
                  />
                  <label className="admin-field-label" style={{ marginTop: 8 }}>
                    expected
                  </label>
                  <input
                    className="admin-field-input"
                    value={stringifyValue(effect.expected)}
                    onChange={(e) =>
                      updateEffect({ expected: parseValue(e.target.value) })
                    }
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="admin-blank-panel-footer">
          <button
            type="button"
            className="admin-blank-delete-btn"
            onClick={() => {
              actions.blanks.remove(blockIdx, blank.id)
              onClose()
            }}
          >
            Delete blank
          </button>
        </div>
      </div>
    </>
  )
}
