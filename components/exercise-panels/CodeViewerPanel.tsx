'use client'

import Editor, { type Monaco } from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import type { Exercise } from '@/lib/lessons'

type Props = {
  exercise: Exercise
  onComplete: (correct: boolean) => void
}

function langFromFilename(filename: string): string {
  if (filename.endsWith('.html')) return 'html'
  if (filename.endsWith('.css')) return 'css'
  return 'javascript'
}

function setupTheme(monaco: Monaco) {
  monaco.editor.defineTheme('codelab-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8B91A8', fontStyle: 'italic' },
      { token: 'keyword', foreground: '3B6FE8' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'D97706' },
    ],
    colors: {
      'editor.background': '#F8F9FC',
      'editor.lineHighlightBackground': '#F1F3F8',
      'editorLineNumber.foreground': '#CDD2E0',
      'editorLineNumber.activeForeground': '#4A5068',
      'editor.selectionBackground': '#EBF0FD',
      'editorCursor.foreground': '#3B6FE8',
      'editorIndentGuide.background': '#E2E6F0',
    },
  })
  monaco.editor.setTheme('codelab-light')
}

function broadcastCss(css: string) {
  document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((iframe) => {
    iframe.contentWindow?.postMessage({ type: 'css-override', css }, '*')
  })
}

export function CodeViewerPanel({ exercise }: Props) {
  const files = exercise.codeFiles ?? []
  const [activeIndex, setActiveIndex] = useState(0)
  const [contents, setContents] = useState<(string | null)[]>(files.map(() => null))
  const [editedContents, setEditedContents] = useState<(string | undefined)[]>(files.map(() => undefined))

  useEffect(() => {
    setActiveIndex(0)
    setContents(files.map(() => null))
    setEditedContents(files.map(() => undefined))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise])

  useEffect(() => {
    if (files.length === 0) return
    files.forEach((file, i) => {
      fetch(file.src)
        .then((r) => r.text())
        .then((text) => {
          setContents((prev) => {
            const next = [...prev]
            next[i] = text
            return next
          })
        })
        .catch(() => {
          setContents((prev) => {
            const next = [...prev]
            next[i] = '// Could not load file'
            return next
          })
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise])

  const activeFile = files[activeIndex]
  const activeContent = contents[activeIndex]
  const isEditable = exercise.editableFiles?.includes(activeFile?.filename ?? '') ?? false

  function handleChange(val: string | undefined) {
    const css = val ?? ''
    setEditedContents((prev) => {
      const next = [...prev]
      next[activeIndex] = css
      return next
    })
    broadcastCss(css)
  }

  return (
    <div className="panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
      <h2 className="panel-heading" style={{ marginBottom: 4 }}>{exercise.title}</h2>
      {exercise.tasks[0] ? (
        <p className="panel-instruction" style={{ marginBottom: 10 }}>{exercise.tasks[0]}</p>
      ) : null}

      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
        {files.map((file, i) => {
          const tabEditable = exercise.editableFiles?.includes(file.filename) ?? false
          return (
            <button
              key={file.filename}
              type="button"
              onClick={() => setActiveIndex(i)}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 500,
                padding: '6px 12px',
                border: 'none',
                borderBottom: i === activeIndex ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: i === activeIndex ? 'var(--accent)' : 'var(--text3)',
                cursor: 'pointer',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {file.filename}
              {tabEditable ? (
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: i === activeIndex ? 'var(--accent)' : 'var(--text3)',
                  opacity: 0.7,
                  background: i === activeIndex ? 'var(--accent-dim, #EBF0FD)' : 'var(--surface2)',
                  borderRadius: 3,
                  padding: '1px 4px',
                }}>
                  live
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {activeContent === null ? (
          <div style={{ padding: 16, fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)', background: '#F8F9FC', height: '100%' }}>
            Loading…
          </div>
        ) : (
          <Editor
            key={`${activeFile?.filename}-${activeIndex}`}
            height="100%"
            language={langFromFilename(activeFile?.filename ?? '')}
            defaultValue={editedContents[activeIndex] ?? activeContent}
            onChange={isEditable ? handleChange : undefined}
            onMount={(_editor, monaco) => setupTheme(monaco)}
            theme="codelab-light"
            options={{
              readOnly: !isEditable,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: isEditable ? 'line' : 'none',
              wordWrap: 'off',
              tabSize: 2,
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: 20,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              contextmenu: false,
              cursorStyle: 'line',
              hideCursorInOverviewRuler: true,
              overviewRulerLanes: 0,
            }}
          />
        )}
      </div>
    </div>
  )
}
