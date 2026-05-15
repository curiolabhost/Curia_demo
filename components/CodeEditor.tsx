'use client'

import Editor, {
  type Monaco,
  type OnMount,
} from '@monaco-editor/react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { getCodeProgress, postCodeProgress } from '@/lib/progressClient'
import { loadCode, saveCode } from '@/lib/storage'

type EditorInstance = Parameters<OnMount>[0]

type CodeEditorProps = {
  lessonId: string
  exerciseIndex: number
  starterCode: string
  isFading?: boolean
  onReady?: () => void
  classroomId?: string | null
  onSaveCode?: (code: string) => void
}

export type CodeEditorHandle = {
  getValue: () => string
  setFocusLines: (
    focusLine?: number,
    focusRange?: [number, number],
  ) => void
  markComplete: () => void
}

const REMOTE_SAVE_DEBOUNCE_MS = 1500

const MONACO_FONT_FAMILY = "'IBM Plex Mono', monospace"

const SKELETON_WIDTHS = ['60%', '85%', '45%', '70%']

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      lessonId,
      exerciseIndex,
      starterCode,
      isFading = false,
      onReady,
      classroomId = null,
      onSaveCode,
    },
    ref,
  ) {
    const [value, setValue] = useState<string>(starterCode)
    const [isMonacoReady, setIsMonacoReady] = useState(false)
    const valueRef = useRef<string>(starterCode)
    const editorInstanceRef = useRef<EditorInstance | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const decorationsRef = useRef<string[]>([])
    const remoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const classroomIdRef = useRef<string | null>(classroomId)
    const lessonIdRef = useRef<string>(lessonId)
    const exerciseIndexRef = useRef<number>(exerciseIndex)

    useEffect(() => {
      classroomIdRef.current = classroomId
    }, [classroomId])

    useEffect(() => {
      lessonIdRef.current = lessonId
      exerciseIndexRef.current = exerciseIndex
    }, [lessonId, exerciseIndex])

    useEffect(() => {
      const next = loadCode(lessonId, exerciseIndex, starterCode)
      setValue(next)
      valueRef.current = next
    }, [lessonId, exerciseIndex, starterCode])

    useEffect(() => {
      if (!classroomId) return
      let cancelled = false
      getCodeProgress(classroomId, lessonId, exerciseIndex)
        .then((res) => {
          if (cancelled) return
          if (
            res.ok &&
            res.progress &&
            typeof res.progress.code === 'string' &&
            res.progress.code.length > 0
          ) {
            const dbCode = res.progress.code
            setValue(dbCode)
            valueRef.current = dbCode
            saveCode(lessonId, exerciseIndex, dbCode)
          }
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }, [classroomId, lessonId, exerciseIndex])

    useEffect(() => {
      return () => {
        if (remoteDebounceRef.current) {
          clearTimeout(remoteDebounceRef.current)
          remoteDebounceRef.current = null
        }
      }
    }, [])

    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      setFocusLines: (focusLine, focusRange) => {
        const ed = editorInstanceRef.current
        const monaco = monacoRef.current
        if (!ed || !monaco) return
        const newDecorations: Parameters<typeof ed.deltaDecorations>[1] = []
        if (focusRange) {
          newDecorations.push({
            range: new monaco.Range(focusRange[0], 1, focusRange[1], 999),
            options: {
              isWholeLine: true,
              className: 'step-focus-region',
            },
          })
        }
        if (focusLine) {
          newDecorations.push({
            range: new monaco.Range(focusLine, 1, focusLine, 999),
            options: {
              isWholeLine: true,
              className: 'step-focus-line',
            },
          })
        }
        decorationsRef.current = ed.deltaDecorations(
          decorationsRef.current,
          newDecorations,
        )
      },
      markComplete: () => {
        if (remoteDebounceRef.current) {
          clearTimeout(remoteDebounceRef.current)
          remoteDebounceRef.current = null
        }
        const cid = classroomIdRef.current
        if (!cid) return
        postCodeProgress(cid, lessonIdRef.current, exerciseIndexRef.current, {
          code: valueRef.current,
          completed: true,
          completedAt: new Date().toISOString(),
        }).catch(() => {})
      },
    }))

    const handleChange = (next: string | undefined) => {
      const nextValue = next ?? ''
      setValue(nextValue)
      valueRef.current = nextValue
      saveCode(lessonId, exerciseIndex, nextValue)
      onSaveCode?.(nextValue)
      if (classroomId) {
        if (remoteDebounceRef.current) clearTimeout(remoteDebounceRef.current)
        const cid = classroomId
        const lid = lessonId
        const eidx = exerciseIndex
        remoteDebounceRef.current = setTimeout(() => {
          postCodeProgress(cid, lid, eidx, {
            code: valueRef.current,
            completed: false,
          }).catch(() => {})
          remoteDebounceRef.current = null
        }, REMOTE_SAVE_DEBOUNCE_MS)
      }
    }

    const handleReset = () => {
      setValue(starterCode)
      valueRef.current = starterCode
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(`codelab__${lessonId}__ex${exerciseIndex}`)
      }
    }

    const handleMount: OnMount = (mountedEditor, monaco) => {
      editorInstanceRef.current = mountedEditor
      monacoRef.current = monaco
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
      onReady?.()
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
