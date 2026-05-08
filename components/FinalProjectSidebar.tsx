'use client'

import { Fragment, useMemo, useState } from 'react'
import type { BlankInputMode, Exercise, Lesson } from '@/lib/lessons'
import { PreviewIframe } from './PreviewIframe'

type FinalProjectSidebarProps = {
  lesson: Lesson
  activeBlockIndex: number
  activeBankIndex: number
  selectedLineIndex: number | null
  selectedBlankIndex: number | null
  allLessons: Lesson[]
}

type ResolvedEntry = {
  lineIndex: number | null
  blankIndex: number | null
  instruction?: string
  explanation: string
  lessonRefs?: string[]
}

function resolveEntry(
  exercise: Exercise | undefined,
  selectedLineIndex: number | null,
  selectedBlankIndex: number | null,
  activeBankIndex: number,
): ResolvedEntry | null {
  if (!exercise) return null
  const lineExplanations = exercise.lineExplanations
  if (lineExplanations && lineExplanations.length > 0) {
    if (selectedLineIndex !== null) {
      const exact = lineExplanations.find(
        (e) =>
          e.lineIndex === selectedLineIndex &&
          e.blankIndex === selectedBlankIndex,
      )
      if (exact) return exact
      if (selectedBlankIndex === null) {
        const lineEntry = lineExplanations.find(
          (e) => e.lineIndex === selectedLineIndex,
        )
        if (lineEntry) return lineEntry
      }
    }
    const byBlank = lineExplanations.find(
      (e) => e.blankIndex === activeBankIndex,
    )
    if (byBlank) return byBlank
    return lineExplanations[0] ?? null
  }
  const blankInstructions = exercise.blankInstructions ?? []
  const blankExplanations = exercise.blankExplanations ?? []
  if (blankInstructions.length === 0 && blankExplanations.length === 0) {
    return null
  }
  const idx = Math.max(
    0,
    Math.min(
      activeBankIndex,
      Math.max(blankInstructions.length, blankExplanations.length) - 1,
    ),
  )
  return {
    lineIndex: null,
    blankIndex: idx,
    instruction: blankInstructions[idx],
    explanation: blankExplanations[idx] ?? '',
  }
}

function findCompletedEntry(
  exercise: Exercise,
  blankIdx: number,
): ResolvedEntry | null {
  const lineExplanations = exercise.lineExplanations
  if (lineExplanations && lineExplanations.length > 0) {
    const found = lineExplanations.find((e) => e.blankIndex === blankIdx)
    if (found) return found
    return null
  }
  const blankInstructions = exercise.blankInstructions ?? []
  const blankExplanations = exercise.blankExplanations ?? []
  return {
    lineIndex: null,
    blankIndex: blankIdx,
    instruction: blankInstructions[blankIdx],
    explanation: blankExplanations[blankIdx] ?? '',
  }
}

const BLOCK_TOKEN = '___BLANK___'

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

function renderLineWithBlankBoxes(line: string, mode: BlankInputMode = 'wordbank') {
  const parts: React.ReactNode[] = []
  let cursor = 0
  let key = 0
  while (cursor < line.length) {
    const found = line.indexOf(BLOCK_TOKEN, cursor)
    if (found === -1) {
      parts.push(<HighlightedSnippet key={key++} value={line.slice(cursor)} />)
      break
    }
    if (found > cursor) {
      parts.push(
        <HighlightedSnippet key={key++} value={line.slice(cursor, found)} />,
      )
    }
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
    cursor = found + BLOCK_TOKEN.length
  }
  if (parts.length === 0) {
    return <HighlightedSnippet value={line} />
  }
  return <>{parts}</>
}

function fillBlanks(line: string, answers: string[]): string {
  let cursor = 0
  let result = ''
  let i = 0
  while (i < line.length) {
    const found = line.indexOf(BLOCK_TOKEN, i)
    if (found === -1) {
      result += line.slice(i)
      break
    }
    result += line.slice(i, found)
    result += answers[cursor] ?? ''
    cursor += 1
    i = found + BLOCK_TOKEN.length
  }
  return result
}

function buildAssembledJs(blocks: Exercise[], upToIndex: number): string {
  const out: string[] = []
  for (let i = 0; i < upToIndex; i += 1) {
    const block = blocks[i]
    if (!block) continue
    const prefix = block.codePrefix ?? ''
    const lines = (block.codeWithBlanks ?? []).map((line) =>
      fillBlanks(line, block.correctOrder ?? []),
    )
    const suffix = block.codeSuffix ?? ''
    const piece = `${prefix}${lines.join('\n')}${suffix ? `\n${suffix}` : ''}`
    out.push(piece)
  }
  return out.join('\n\n')
}

function truncate(label: string, max = 12): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function findLineIndexForBlank(
  codeWithBlanks: string[],
  blankIdx: number,
): number {
  let cum = 0
  for (let i = 0; i < codeWithBlanks.length; i += 1) {
    let n = 0
    let j = 0
    while (true) {
      const found = codeWithBlanks[i].indexOf(BLOCK_TOKEN, j)
      if (found === -1) break
      n += 1
      j = found + BLOCK_TOKEN.length
    }
    if (n > 0 && blankIdx >= cum && blankIdx < cum + n) return i
    cum += n
  }
  return -1
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

  const assembledUpTo = allDone ? totalBlocks : safeActiveIndex
  const assembledJs = useMemo(
    () => buildAssembledJs(blocks, assembledUpTo),
    [blocks, assembledUpTo],
  )

  const htmlTemplate = lesson.finalProject?.htmlTemplate ?? ''
  const cssTemplate = lesson.finalProject?.cssTemplate ?? ''

  const blockLessonRefs = activeBlock?.lessonRefs ?? []
  const totalBlanks = activeBlock?.correctOrder?.length ?? 0
  const safeBankIndex = Math.max(
    0,
    Math.min(activeBankIndex, Math.max(totalBlanks - 1, 0)),
  )
  const codeWithBlanks = activeBlock?.codeWithBlanks ?? []
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

  const entryLineIdx =
    activeEntry?.lineIndex ??
    (activeEntry?.blankIndex !== null && activeEntry?.blankIndex !== undefined
      ? findLineIndexForBlank(codeWithBlanks, activeEntry.blankIndex)
      : -1)
  const activeLine =
    entryLineIdx >= 0 && entryLineIdx < codeWithBlanks.length
      ? codeWithBlanks[entryLineIdx]
      : codeWithBlanks[0] ?? ''
  const entryBlankIdx = activeEntry?.blankIndex ?? null
  const currentInstruction = activeEntry?.instruction ?? ''
  const currentExplanation = activeEntry?.explanation ?? ''
  const currentMode: BlankInputMode =
    entryBlankIdx !== null
      ? activeBlock?.blankInputMode?.[entryBlankIdx] ?? 'wordbank'
      : 'wordbank'

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
          const isLocked = !allDone && idx > safeActiveIndex
          const cls = `fp-block-dot ${
            isDone ? 'fp-done' : isActive ? 'fp-active' : 'fp-locked'
          }`
          return (
            <button
              key={`${block.title}-${idx}`}
              type="button"
              className={cls}
              onClick={() => handleDotClick(idx)}
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
        })}
      </div>

      <div className={`fp-instructions${previewExpanded ? ' hidden' : ''}`}>
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
              {activeBlock?.title ?? ''}
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
                        renderLineWithBlankBoxes(activeLine, currentMode)
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="fp-line-label">This line does:</div>
                    <div className="fp-no-blank-snippet">
                      <HighlightedSnippet value={activeLine} />
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
        className={`fp-preview-section${previewExpanded ? ' expanded' : ''}`}
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
        <div className="fp-preview-iframe">
          <PreviewIframe
            htmlTemplate={htmlTemplate}
            cssTemplate={cssTemplate}
            assembledJs={assembledJs}
            refreshKey={refreshKey}
          />
        </div>
      </div>
    </aside>
  )
}
