'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Split from 'react-split'
import type { EditActions } from '@/lib/admin/useLessonDraft'
import type {
  BlankInputMode,
  Exercise,
  FinalProjectBlank,
  FinalProjectLine,
  Lesson,
} from '@/lib/lessons'
import { PreviewIframe } from './PreviewIframe'

type FinalProjectSidebarProps = {
  lesson: Lesson
  activeBlockIndex: number
  activeBankIndex: number
  selectedLineIndex: number | null
  selectedBlankIndex: number | null
  allLessons: Lesson[]
  editMode?: boolean
  editActions?: EditActions
}

type InlineTextEditProps = {
  value: string
  onCommit: (next: string) => void
  className?: string
  multiline?: boolean
  placeholder?: string
}

function InlineTextEdit({
  value,
  onCommit,
  className,
  multiline,
  placeholder,
}: InlineTextEditProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const baseClass = `admin-editable${editing ? ' editing' : ''}${className ? ` ${className}` : ''}`

  if (!editing) {
    return (
      <span
        className={baseClass}
        onClick={() => setEditing(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setEditing(true)
          }
        }}
      >
        {value.length > 0 ? value : (
          <span style={{ color: 'var(--text3)' }}>{placeholder ?? 'Click to edit'}</span>
        )}
      </span>
    )
  }

  if (multiline) {
    return (
      <textarea
        className="admin-inline-textarea"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft !== value) onCommit(draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
      />
    )
  }

  return (
    <input
      className="admin-inline-input"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false)
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          ;(e.currentTarget as HTMLInputElement).blur()
        } else if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}

type AdminTaskListProps = {
  blockIdx: number
  tasks: string[]
  actions: EditActions
}

function AdminTaskList({ blockIdx, tasks, actions }: AdminTaskListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tasks.map((task, i) => (
        <div key={i} className="admin-task-row">
          <span
            style={{
              flexShrink: 0,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#ffffff',
              fontFamily: 'var(--mono)',
              fontSize: '9px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i + 1}
          </span>
          <input
            className="admin-task-input"
            value={task}
            onChange={(e) => actions.tasks.edit(blockIdx, i, e.target.value)}
            placeholder="Task description"
          />
          <span className="admin-task-actions">
            <button
              type="button"
              className="admin-icon-btn"
              title="Move up"
              onClick={() => actions.tasks.move(blockIdx, i, i - 1)}
              disabled={i === 0}
            >
              ↑
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              title="Move down"
              onClick={() => actions.tasks.move(blockIdx, i, i + 1)}
              disabled={i === tasks.length - 1}
            >
              ↓
            </button>
            <button
              type="button"
              className="admin-icon-btn danger"
              title="Delete task"
              onClick={() => actions.tasks.delete(blockIdx, i)}
            >
              ×
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        className="admin-add-task-btn"
        onClick={() => actions.tasks.add(blockIdx)}
      >
        + Add task
      </button>
    </div>
  )
}

type ResolvedEntry = {
  lineIndex: number | null
  blankIndex: number | null
  instruction?: string
  explanation: string
  lessonRefs?: string[]
}

const BLANK_RE = /<<([^>]+)>>/g

function buildBlankMap(
  blanks: FinalProjectBlank[],
): Map<string, FinalProjectBlank> {
  const m = new Map<string, FinalProjectBlank>()
  for (const b of blanks) m.set(b.id, b)
  return m
}

function findLineIndexForBlankId(
  lines: FinalProjectLine[],
  blankId: string,
): number {
  return lines.findIndex((l) => l.text.includes(`<<${blankId}>>`))
}

function fillLineFromMap(
  text: string,
  resolve: (id: string) => string,
): string {
  return text.replace(new RegExp(BLANK_RE.source, 'g'), (_, id: string) =>
    resolve(id),
  )
}

function resolveEntry(
  exercise: Exercise | undefined,
  selectedLineIndex: number | null,
  selectedBlankIndex: number | null,
  activeBankIndex: number,
): ResolvedEntry | null {
  if (!exercise) return null
  const lines = exercise.lines ?? []
  const blanks = exercise.blanks ?? []
  if (lines.length === 0 && blanks.length === 0) return null

  if (selectedLineIndex !== null) {
    if (
      selectedBlankIndex !== null &&
      selectedBlankIndex >= 0 &&
      selectedBlankIndex < blanks.length
    ) {
      const b = blanks[selectedBlankIndex]
      return {
        lineIndex: selectedLineIndex,
        blankIndex: selectedBlankIndex,
        instruction: b.instruction,
        explanation: b.explanation ?? '',
        lessonRefs: b.lessonRefs,
      }
    }
    if (
      selectedBlankIndex === null &&
      selectedLineIndex >= 0 &&
      selectedLineIndex < lines.length
    ) {
      const l = lines[selectedLineIndex]
      return {
        lineIndex: selectedLineIndex,
        blankIndex: null,
        explanation: l.explanation ?? '',
        lessonRefs: l.lessonRefs,
      }
    }
  }

  if (activeBankIndex >= 0 && activeBankIndex < blanks.length) {
    const b = blanks[activeBankIndex]
    const lineIdx = findLineIndexForBlankId(lines, b.id)
    return {
      lineIndex: lineIdx >= 0 ? lineIdx : null,
      blankIndex: activeBankIndex,
      instruction: b.instruction,
      explanation: b.explanation ?? '',
      lessonRefs: b.lessonRefs,
    }
  }

  if (blanks.length > 0) {
    const b = blanks[0]
    const lineIdx = findLineIndexForBlankId(lines, b.id)
    return {
      lineIndex: lineIdx >= 0 ? lineIdx : null,
      blankIndex: 0,
      instruction: b.instruction,
      explanation: b.explanation ?? '',
      lessonRefs: b.lessonRefs,
    }
  }

  return null
}

function findCompletedEntry(
  exercise: Exercise,
  blankIdx: number,
): ResolvedEntry | null {
  const blanks = exercise.blanks ?? []
  const lines = exercise.lines ?? []
  if (blankIdx < 0 || blankIdx >= blanks.length) return null
  const b = blanks[blankIdx]
  const lineIdx = findLineIndexForBlankId(lines, b.id)
  return {
    lineIndex: lineIdx >= 0 ? lineIdx : null,
    blankIndex: blankIdx,
    instruction: b.instruction,
    explanation: b.explanation ?? '',
    lessonRefs: b.lessonRefs,
  }
}

const KEYWORDS = new Set([
  'let',
  'const',
  'var',
  'if',
  'else',
  'return',
  'function',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'typeof',
  'in',
  'of',
  'true',
  'false',
  'null',
  'undefined',
])

type Tok = { kind: string; value: string }

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const eol = src.indexOf('\n', i)
      const end = eol === -1 ? src.length : eol
      out.push({ kind: 'comment', value: src.slice(i, end) })
      i = end
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      let j = i + 1
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j += 2
        else j += 1
      }
      out.push({ kind: 'string', value: src.slice(i, j + 1) })
      i = Math.min(j + 1, src.length)
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1
      out.push({ kind: 'number', value: src.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j += 1
      const ident = src.slice(i, j)
      if (KEYWORDS.has(ident)) {
        out.push({ kind: 'keyword', value: ident })
      } else if (src[j] === '(') {
        out.push({ kind: 'fn', value: ident })
      } else {
        out.push({ kind: 'ident', value: ident })
      }
      i = j
      continue
    }
    if (c === ' ' || c === '\t') {
      let j = i
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j += 1
      out.push({ kind: 'ws', value: src.slice(i, j) })
      i = j
      continue
    }
    out.push({ kind: 'punct', value: c })
    i += 1
  }
  return out
}

function colorFor(kind: string): string | undefined {
  if (kind === 'keyword') return '#cba6f7'
  if (kind === 'string') return '#a6e3a1'
  if (kind === 'number') return '#fab387'
  if (kind === 'comment') return '#6c7086'
  if (kind === 'fn') return '#89b4fa'
  return undefined
}

function HighlightedSnippet({ value }: { value: string }) {
  const toks = tokenize(value)
  return (
    <>
      {toks.map((tok, i) => {
        if (tok.kind === 'ws') return <Fragment key={i}>{tok.value}</Fragment>
        const color = colorFor(tok.kind) ?? '#cdd6f4'
        const style: React.CSSProperties = {
          color,
          fontStyle: tok.kind === 'comment' ? 'italic' : undefined,
        }
        return (
          <span key={i} style={style}>
            {tok.value}
          </span>
        )
      })}
    </>
  )
}

function renderLineWithBlankBoxes(
  text: string,
  blanksById: Map<string, FinalProjectBlank>,
) {
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  const re = new RegExp(BLANK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(
        <HighlightedSnippet
          key={key++}
          value={text.slice(cursor, match.index)}
        />,
      )
    }
    const blankId = match[1]
    const mode = blanksById.get(blankId)?.mode ?? 'wordbank'
    if (mode === 'type') {
      parts.push(
        <span key={key++} className="fp-type-slot">type here</span>,
      )
    } else {
      parts.push(
        <span key={key++} className="fp-drop-zone fp-dz-empty">
          <span className="fp-dz-hint">?</span>
        </span>,
      )
    }
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    parts.push(<HighlightedSnippet key={key++} value={text.slice(cursor)} />)
  }
  if (parts.length === 0) {
    return <HighlightedSnippet value={text} />
  }
  return <>{parts}</>
}

function buildAssembledJs(blocks: Exercise[], upToIndex: number): string {
  const out: string[] = []
  for (let i = 0; i < upToIndex; i += 1) {
    const block = blocks[i]
    if (!block) continue
    const prefix = block.codePrefix ?? ''
    const blockLines = block.lines ?? []
    const blockBlanks = block.blanks ?? []
    const blockBlanksById = buildBlankMap(blockBlanks)
    const filledLines = blockLines.map((line) =>
      fillLineFromMap(line.text, (id) => blockBlanksById.get(id)?.answer ?? ''),
    )
    const suffix = block.codeSuffix ?? ''
    const piece = `${prefix}${filledLines.join('\n')}${suffix ? `\n${suffix}` : ''}`
    out.push(piece)
  }
  return out.join('\n\n')
}

function truncate(label: string, max = 12): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14h6m0 0v6m0-6l-7 7" />
      <path d="M20 10h-6m0 0V4m0 6l7-7" />
    </svg>
  )
}

function NewTabIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  )
}

function CheckIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function FinalProjectSidebar({
  lesson,
  activeBlockIndex,
  activeBankIndex,
  selectedLineIndex,
  selectedBlankIndex,
  allLessons,
  editMode = false,
  editActions,
}: FinalProjectSidebarProps) {
  const blocks = lesson.exercises
  const totalBlocks = blocks.length
  const allDone = activeBlockIndex >= totalBlocks
  const safeActiveIndex = allDone
    ? totalBlocks - 1
    : Math.max(0, Math.min(activeBlockIndex, totalBlocks - 1))
  const activeBlock = blocks[safeActiveIndex]
  const doneCount = allDone ? totalBlocks : safeActiveIndex
  const [refreshKey, setRefreshKey] = useState(0)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [splitSizes, setSplitSizes] = useState<[number, number]>([62, 38])
  const splitRef = useRef<
    (Split & { split: { setSizes: (sizes: number[]) => void } }) | null
  >(null)

  useEffect(() => {
    if (!splitRef.current?.split) return
    if (previewExpanded) {
      splitRef.current.split.setSizes([0, 100])
    } else {
      splitRef.current.split.setSizes(splitSizes)
    }
  }, [previewExpanded])

  const assembledUpTo = allDone ? totalBlocks : safeActiveIndex
  const assembledJs = useMemo(
    () => buildAssembledJs(blocks, assembledUpTo),
    [blocks, assembledUpTo],
  )

  const htmlTemplate = lesson.finalProject?.htmlTemplate ?? ''
  const cssTemplate = lesson.finalProject?.cssTemplate ?? ''

  const blockLessonRefs = activeBlock?.lessonRefs ?? []
  const activeBlockBlanks = activeBlock?.blanks ?? []
  const activeBlockLines = activeBlock?.lines ?? []
  const activeBlockBlanksById = useMemo(
    () => buildBlankMap(activeBlockBlanks),
    [activeBlockBlanks],
  )
  const totalBlanks = activeBlockBlanks.length
  const safeBankIndex = Math.max(
    0,
    Math.min(activeBankIndex, Math.max(totalBlanks - 1, 0)),
  )
  const activeEntry = useMemo(
    () =>
      resolveEntry(
        activeBlock,
        selectedLineIndex,
        selectedBlankIndex,
        safeBankIndex,
      ),
    [activeBlock, selectedLineIndex, selectedBlankIndex, safeBankIndex],
  )

  const entryBlankIdx = activeEntry?.blankIndex ?? null
  const entryLineIdx =
    activeEntry?.lineIndex ??
    (entryBlankIdx !== null && entryBlankIdx >= 0 && entryBlankIdx < activeBlockBlanks.length
      ? findLineIndexForBlankId(activeBlockLines, activeBlockBlanks[entryBlankIdx].id)
      : -1)
  const activeLineText =
    entryLineIdx >= 0 && entryLineIdx < activeBlockLines.length
      ? activeBlockLines[entryLineIdx].text
      : activeBlockLines[0]?.text ?? ''
  const currentInstruction = activeEntry?.instruction ?? ''
  const currentExplanation = activeEntry?.explanation ?? ''
  const activeBlank =
    entryBlankIdx !== null &&
    entryBlankIdx >= 0 &&
    entryBlankIdx < activeBlockBlanks.length
      ? activeBlockBlanks[entryBlankIdx]
      : null
  const currentMode: BlankInputMode = activeBlank?.mode ?? 'wordbank'

  const entryLessonRefs =
    activeEntry?.lessonRefs && activeEntry.lessonRefs.length > 0
      ? activeEntry.lessonRefs
      : blockLessonRefs
  const refLessons = entryLessonRefs
    .map((id) => allLessons.find((l) => l.id === id))
    .filter((l): l is Lesson => Boolean(l))

  const hasInstructionContent = Boolean(
    activeEntry &&
      (activeEntry.instruction || activeEntry.explanation),
  )

  const handleDotClick = (index: number) => {
    if (index >= safeActiveIndex && !allDone) return
    if (typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('fp:goto-block', { detail: { index } }),
    )
  }

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  const handleOpenInNewTab = () => {
    if (typeof window === 'undefined') return
    const doc = [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<meta charset="UTF-8">',
      '<style>' + cssTemplate + '</style>',
      '</head>',
      '<body>',
      htmlTemplate,
      '<script>' + assembledJs + '<\/script>',
      '</body>',
      '</html>',
    ].join('\n')
    const blob = new Blob([doc], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <aside className="fp-sidebar">
      <div className="fp-sidebar-header">
        <span
          style={{
            fontFamily: 'var(--sans)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text)',
          }}
        >
          Final Project
        </span>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'var(--purple-dim)',
              color: 'var(--purple)',
              border: '1px solid #c4b5fd',
              borderRadius: '4px',
              padding: '3px 8px',
            }}
          >
            Session 6
          </span>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: 'var(--text3)',
            }}
          >
            {doneCount} / {totalBlocks} blocks
          </span>
        </div>
      </div>

      <div
        className={`fp-block-nav${previewExpanded ? ' hidden' : ''}`}
        role="tablist"
        aria-label="Final project blocks"
      >
        {blocks.map((block, idx) => {
          const isDone = allDone || idx < safeActiveIndex
          const isActive = !allDone && idx === safeActiveIndex
          const isLocked = editMode ? false : !allDone && idx > safeActiveIndex
          const cls = `fp-block-dot ${
            isDone ? 'fp-done' : isActive ? 'fp-active' : 'fp-locked'
          }`
          const dotButton = (
            <button
              type="button"
              className={cls}
              onClick={() => {
                if (editMode) {
                  if (typeof window === 'undefined') return
                  window.dispatchEvent(
                    new CustomEvent('fp:goto-block', { detail: { index: idx } }),
                  )
                  return
                }
                handleDotClick(idx)
              }}
              disabled={isLocked}
              aria-current={isActive ? 'step' : undefined}
              title={block.title}
            >
              <span className="fp-block-num">
                {isDone ? <CheckIcon size={10} /> : idx + 1}
              </span>
              <span className="fp-block-label">{truncate(block.title)}</span>
            </button>
          )
          if (!editMode || !editActions) {
            return <Fragment key={`${block.title}-${idx}`}>{dotButton}</Fragment>
          }
          const hasContent =
            (block.lines?.length ?? 0) > 0 ||
            (block.blanks?.length ?? 0) > 0 ||
            (block.tokenBank?.length ?? 0) > 0 ||
            (block.tasks?.length ?? 0) > 0
          return (
            <div
              key={`${block.title}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {dotButton}
              <span className="admin-block-actions">
                <button
                  type="button"
                  className="admin-icon-btn"
                  title="Move block up"
                  onClick={() => editActions.blocks.move(idx, idx - 1)}
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  title="Move block down"
                  onClick={() => editActions.blocks.move(idx, idx + 1)}
                  disabled={idx === blocks.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-icon-btn danger"
                  title="Delete block"
                  onClick={() => {
                    if (
                      hasContent &&
                      typeof window !== 'undefined' &&
                      !window.confirm(
                        `Delete block "${block.title}"? It has content that will be lost.`,
                      )
                    ) {
                      return
                    }
                    editActions.blocks.delete(idx)
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          )
        })}
        {editMode && editActions ? (
          <button
            type="button"
            className="admin-add-block-btn"
            onClick={() => editActions.blocks.add(blocks.length)}
            title="Add block at end"
          >
            + Add block
          </button>
        ) : null}
      </div>

      <Split
        ref={splitRef}
        direction="vertical"
        sizes={splitSizes}
        minSize={[180, 240]}
        gutterSize={6}
        snapOffset={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(sizes: number[]) => {
          setIsDragging(false)
          setSplitSizes([sizes[0], sizes[1]])
        }}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
        className={`fp-split${previewExpanded ? ' preview-expanded' : ''}`}
      >
      <div
        className={`fp-instructions${previewExpanded ? ' hidden' : ''}`}
        style={{ overflow: 'auto', minHeight: 0 }}
      >
        {allDone ? (
          <div className="fp-celebration">
            <div className="fp-celebration-icon" aria-hidden>
              <span
                style={{
                  display: 'inline-flex',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--green)',
                  color: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckIcon size={20} />
              </span>
            </div>
            <div className="fp-celebration-title">
              You built a reaction timer!
            </div>
            <div className="fp-celebration-body">
              All {totalBlocks} blocks are complete. Your program is running in
              the preview below. Try clicking it!
            </div>
            <div className="fp-celebration-sub">
              Want to change something? Switch to any block in the code editor
              and edit it directly.
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text3)',
                marginBottom: '6px',
              }}
            >
              Block {safeActiveIndex + 1} of {totalBlocks}
            </div>

            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '14px',
              }}
            >
              {editMode && editActions ? (
                <InlineTextEdit
                  value={activeBlock?.title ?? ''}
                  onCommit={(next) =>
                    editActions.blocks.updateMeta(safeActiveIndex, {
                      title: next,
                    })
                  }
                  placeholder="Block title"
                />
              ) : (
                activeBlock?.title ?? ''
              )}
            </div>

            {hasInstructionContent ? (
              <>
                {entryBlankIdx !== null ? (
                  <>
                    <div className="fp-line-instruction-label">
                      You are working on:
                    </div>
                    <div className="fp-line-code-preview">
                      {currentMode === 'freeline' ? (
                        <>
                          <div
                            style={{
                              color: '#45475a',
                              fontFamily: 'var(--mono)',
                              fontSize: '11px',
                            }}
                          >
                            {entryLineIdx >= 0 ? entryLineIdx + 1 : 1}
                          </div>
                          <span className="fp-freeline-slot" />
                        </>
                      ) : (
                        renderLineWithBlankBoxes(
                          activeLineText,
                          activeBlockBlanksById,
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fp-line-label">This line does:</div>
                    <div className="fp-no-blank-snippet">
                      <HighlightedSnippet value={activeLineText} />
                    </div>
                  </>
                )}

                {activeEntry?.instruction ? (
                  <div className="fp-instruction-card">{currentInstruction}</div>
                ) : null}
                {currentExplanation ? (
                  <div className="fp-explanation">{currentExplanation}</div>
                ) : null}

                {entryBlankIdx !== null ? (
                  <div className="fp-blank-progress">
                    {Array.from({ length: totalBlanks }, (_, i) => {
                      const cls =
                        i < entryBlankIdx
                          ? 'fp-blank-dot done'
                          : i === entryBlankIdx
                            ? 'fp-blank-dot current'
                            : 'fp-blank-dot upcoming'
                      return <span key={i} className={cls} aria-hidden />
                    })}
                    <span className="fp-blank-progress-label">
                      Blank {entryBlankIdx + 1} of {totalBlanks}
                    </span>
                  </div>
                ) : null}

                {entryBlankIdx !== null && entryBlankIdx > 0 ? (
                  <div className="fp-completed-blanks">
                    <div className="fp-completed-label">Completed blanks</div>
                    {Array.from({ length: entryBlankIdx }, (_, i) => {
                      const completed = activeBlock
                        ? findCompletedEntry(activeBlock, i)
                        : null
                      const text =
                        completed?.instruction ??
                        completed?.explanation ??
                        ''
                      return (
                        <div
                          key={i}
                          className="fp-completed-row"
                          onClick={() => {
                            if (typeof window === 'undefined') return
                            window.dispatchEvent(
                              new CustomEvent('fp:highlight-blank', {
                                detail: { index: i },
                              }),
                            )
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="fp-completed-check" aria-hidden>
                            <CheckIcon size={8} />
                          </span>
                          <span className="fp-completed-text">{text}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </>
            ) : editMode && editActions ? (
              <AdminTaskList
                blockIdx={safeActiveIndex}
                tasks={activeBlock?.tasks ?? []}
                actions={editActions}
              />
            ) : (
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {(activeBlock?.tasks ?? []).map((task, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: '#ffffff',
                        fontFamily: 'var(--mono)',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.55,
                        color: 'var(--text2)',
                      }}
                    >
                      {task}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {editMode && editActions && hasInstructionContent ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text3)',
                    marginBottom: '6px',
                  }}
                >
                  Tasks (edit)
                </div>
                <AdminTaskList
                  blockIdx={safeActiveIndex}
                  tasks={activeBlock?.tasks ?? []}
                  actions={editActions}
                />
              </div>
            ) : null}

            {editMode && editActions ? (
              <div className="admin-hint-block">
                <span className="admin-hint-block-label">Hint</span>
                <textarea
                  className="admin-hint-block-input"
                  value={activeBlock?.hint ?? ''}
                  onChange={(e) =>
                    editActions.blocks.updateMeta(safeActiveIndex, {
                      hint: e.target.value,
                    })
                  }
                  placeholder="Hint text shown to the student"
                />
              </div>
            ) : null}

            {refLessons.length > 0 ? (
              <>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text3)',
                    marginTop: '14px',
                    marginBottom: '8px',
                  }}
                >
                  What you used
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {refLessons.map((l) => (
                    <span key={l.id} className="fp-lesson-ref-pill">
                      <span
                        aria-hidden
                        style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: 'var(--sans)',
                          fontSize: '12px',
                          color: 'var(--text2)',
                        }}
                      >
                        {l.title}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      <div
        className="fp-preview-section"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="fp-preview-bar">
          <span
            className="fp-preview-dot"
            style={{ background: '#ff5f57' }}
            aria-hidden
          />
          <span
            className="fp-preview-dot"
            style={{ background: '#febc2e' }}
            aria-hidden
          />
          <span
            className="fp-preview-dot"
            style={{ background: '#28c840' }}
            aria-hidden
          />
          <span className="fp-preview-label">Live Preview</span>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <button
              type="button"
              className="fp-preview-btn"
              onClick={() => setPreviewExpanded((v) => !v)}
              aria-label={previewExpanded ? 'Collapse preview' : 'Expand preview'}
              title={previewExpanded ? 'Collapse preview' : 'Expand preview'}
            >
              {previewExpanded ? <CollapseIcon /> : <ExpandIcon />}
            </button>
            <button
              type="button"
              className="fp-preview-btn"
              onClick={handleOpenInNewTab}
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <NewTabIcon />
            </button>
            <button
              type="button"
              className="fp-preview-refresh"
              onClick={handleRefresh}
              aria-label="Refresh preview"
              title="Refresh preview"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            padding: '8px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              cursor: 'ns-resize',
              pointerEvents: isDragging ? 'auto' : 'none',
            }}
          />
          <PreviewIframe
            htmlTemplate={htmlTemplate}
            cssTemplate={cssTemplate}
            assembledJs={assembledJs}
            refreshKey={refreshKey}
          />
        </div>
      </div>
      </Split>
    </aside>
  )
}
