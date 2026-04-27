'use client'

import Editor, { type Monaco } from '@monaco-editor/react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { loadCode, saveCode } from '@/lib/storage'

type CodeEditorProps = {
  lessonId: string
  exerciseIndex: number
  starterCode: string
  isFading?: boolean
}

export type CodeEditorHandle = {
  getValue: () => string
}

const MONACO_FONT_FAMILY = "'IBM Plex Mono', monospace"

const SKELETON_WIDTHS = ['60%', '85%', '45%', '70%']

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { lessonId, exerciseIndex, starterCode, isFading = false },
    ref,
  ) {
    const [value, setValue] = useState<string>(starterCode)
    const [isMonacoReady, setIsMonacoReady] = useState(false)
    const valueRef = useRef<string>(starterCode)

    useEffect(() => {
      const next = loadCode(lessonId, exerciseIndex, starterCode)
      setValue(next)
      valueRef.current = next
    }, [lessonId, exerciseIndex, starterCode])

    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
    }))

    const handleChange = (next: string | undefined) => {
      const nextValue = next ?? ''
      setValue(nextValue)
      valueRef.current = nextValue
      saveCode(lessonId, exerciseIndex, nextValue)
    }

    const handleReset = () => {
      setValue(starterCode)
      valueRef.current = starterCode
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`codelab__${lessonId}__ex${exerciseIndex}`)
      }
    }

    const handleMount = (_editor: unknown, monaco: Monaco) => {
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
      setIsMonacoReady(true)
    }

    return (
      <div className={`editor-pane${isFading ? ' fading' : ''}`}>
        <div className="tab-bar">
          <div className="tab active">script.js</div>
          <div className="tab-spacer" />
          <button className="reset-button" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
        <div className="editor-area" id="editor-wrapper">
          {!isMonacoReady ? (
            <div className="editor-skeleton" aria-hidden>
              {SKELETON_WIDTHS.map((width, i) => (
                <div
                  key={i}
                  className="editor-skeleton-line"
                  style={{ width }}
                />
              ))}
            </div>
          ) : null}
          <Editor
            key={`${lessonId}-${exerciseIndex}`}
            height="100%"
            language="javascript"
            value={value}
            onChange={handleChange}
            onMount={handleMount}
            theme="codelab-light"
            options={{
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
              renderLineHighlight: 'line',
              smoothScrolling: true,
              wordWrap: 'on',
              tabSize: 2,
              fontSize: 13,
              fontFamily: MONACO_FONT_FAMILY,
              lineHeight: 22,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    )
  },
)
