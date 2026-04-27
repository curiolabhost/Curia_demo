'use client'

import { useEffect, useRef, useState } from 'react'
import type { CheckResult, LogEntry, LogType } from '@/lib/sandbox'

type OutputConsoleProps = {
  entries: LogEntry[]
  checkResults: CheckResult[]
  onClear: () => void
  shortcutHint?: string
}

const ICONS: Record<LogType, string> = {
  log: '›',
  error: '✕',
  warn: '⚠',
  info: 'ℹ',
  result: '✓',
}

function formatActual(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function buildClipboardText(
  entries: LogEntry[],
  checkResults: CheckResult[],
): string {
  const lines: string[] = []
  for (const entry of entries) {
    lines.push(entry.args.join(' '))
  }
  if (checkResults.length > 0) {
    lines.push('')
    lines.push('Checks')
    for (const r of checkResults) {
      const mark = r.passed ? '✓' : '✕'
      const tail = r.passed ? '' : ` — got: ${formatActual(r.actual)}`
      lines.push(`${mark} ${r.label}${tail}`)
    }
    const passed = checkResults.filter((r) => r.passed).length
    lines.push(`${passed} / ${checkResults.length} passed`)
  }
  return lines.join('\n')
}

export function OutputConsole({
  entries,
  checkResults,
  onClear,
  shortcutHint,
}: OutputConsoleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [entries, checkResults])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const passedCount = checkResults.filter((r) => r.passed).length
  const totalCount = checkResults.length
  const allPassed = totalCount > 0 && passedCount === totalCount
  const hasContent = entries.length > 0 || checkResults.length > 0

  const handleCopy = async () => {
    if (!hasContent) return
    const text = buildClipboardText(entries, checkResults)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="output-pane">
      <div className="tab-bar">
        <div className="tab active">Console</div>
        <div className="tab-spacer" />
        <button
          className="reset-button"
          type="button"
          onClick={handleCopy}
          disabled={!hasContent}
          style={{ marginRight: 6 }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button className="reset-button" type="button" onClick={onClear}>
          {'✕'} Clear
        </button>
      </div>
      <div className="output-area" ref={containerRef}>
        {!hasContent ? (
          <div className="output-empty-state">
            <span className="output-empty-icon" aria-hidden>▶</span>
            <span className="output-empty-primary">
              Run your code to see output
            </span>
            {shortcutHint ? (
              <span className="output-empty-secondary">
                {shortcutHint} to run
              </span>
            ) : null}
          </div>
        ) : (
          <>
            {entries.map((entry, i) => (
              <div className={`log-line ${entry.type}`} key={i}>
                <span className="log-icon">{ICONS[entry.type]}</span>
                <span className="log-text">{entry.args.join(' ')}</span>
              </div>
            ))}
            {checkResults.length > 0 && (
              <div className="checks-section">
                <div className="checks-header">Checks</div>
                {checkResults.map((result) => (
                  <div className="check-row" key={result.id}>
                    <span
                      className={`check-icon ${result.passed ? 'pass' : 'fail'}`}
                    >
                      {result.passed ? '✓' : '✕'}
                    </span>
                    <span
                      className={`check-label ${result.passed ? 'pass' : 'fail'}`}
                    >
                      {result.label}
                      {!result.passed && (
                        <span className="check-actual">
                          {' '}— got: {formatActual(result.actual)}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
                <div
                  className={`checks-summary ${allPassed ? 'pass' : 'fail'}`}
                >
                  {passedCount} / {totalCount} passed
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
