'use client'

import { useEffect, useRef, useState } from 'react'

type PrismEditorProps = {
  code: string
  language: 'html' | 'css' | 'javascript'
  onChange: (value: string) => void
  readOnly: boolean
  readOnlyMessage?: string
}

export function PrismEditor({
  code,
  language,
  onChange,
  readOnly,
  readOnlyMessage,
}: PrismEditorProps) {
  const [highlighted, setHighlighted] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const pendingCursorRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    import('prismjs').then(async (mod) => {
      const Prism = (mod as { default?: typeof import('prismjs') }).default ?? mod
      // @ts-expect-error - side-effect imports for language components
      await import('prismjs/components/prism-markup')
      // @ts-expect-error - side-effect imports for language components
      await import('prismjs/components/prism-css')
      // @ts-expect-error - side-effect imports for language components
      await import('prismjs/components/prism-javascript')
      if (cancelled) return
      let grammar: import('prismjs').Grammar
      let alias: string
      if (language === 'html') {
        grammar = Prism.languages.markup
        alias = 'markup'
      } else if (language === 'css') {
        grammar = Prism.languages.css
        alias = 'css'
      } else {
        grammar = Prism.languages.javascript
        alias = 'javascript'
      }
      setHighlighted(Prism.highlight(code, grammar, alias))
    })
    return () => {
      cancelled = true
    }
  }, [code, language])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    const handler = () => {
      if (preRef.current && textareaRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop
        preRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
    }
    ta.addEventListener('scroll', handler)
    return () => {
      ta.removeEventListener('scroll', handler)
    }
  }, [])

  useEffect(() => {
    if (pendingCursorRef.current !== null && textareaRef.current) {
      const pos = pendingCursorRef.current
      textareaRef.current.selectionStart = pos
      textareaRef.current.selectionEnd = pos
      pendingCursorRef.current = null
    }
  }, [code])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newValue = code.slice(0, start) + '  ' + code.slice(end)
      pendingCursorRef.current = start + 2
      onChange(newValue)
    }
  }

  const showBanner = readOnly && readOnlyMessage !== ''
  const bannerText = readOnlyMessage ?? 'Complete all script.js blocks to edit this file'
  const padTop = showBanner ? 36 : 16

  return (
    <div className="prism-editor">
      {showBanner ? (
        <div className="prism-editor-banner">
          {bannerText}
        </div>
      ) : null}
      <pre
        ref={preRef}
        aria-hidden
        style={{ paddingTop: padTop }}
      >
        <code
          className={`language-${language === 'html' ? 'markup' : 'css'}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
      <textarea
        ref={textareaRef}
        value={code}
        readOnly={readOnly}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{ paddingTop: padTop }}
      />
    </div>
  )
}
