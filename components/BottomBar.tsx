'use client'

import { useEffect, useRef, useState } from 'react'

type BottomBarProps = {
  onRun?: () => void
  onHintToggle?: () => void
  hintDisabled?: boolean
  isRunning?: boolean
  statusMessage?: string
  statusType?: 'default' | 'ok' | 'err'
}

export function BottomBar({
  onRun,
  onHintToggle,
  hintDisabled,
  isRunning = false,
  statusMessage = 'Ready',
  statusType = 'default',
}: BottomBarProps = {}) {
  const statusClass =
    statusType === 'ok' ? ' ok' : statusType === 'err' ? ' err' : ''

  const [statusVisible, setStatusVisible] = useState(true)
  const prevMessageRef = useRef<string>(statusMessage)

  useEffect(() => {
    if (prevMessageRef.current === statusMessage) return
    prevMessageRef.current = statusMessage
    setStatusVisible(false)
    const id = window.setTimeout(() => setStatusVisible(true), 20)
    return () => window.clearTimeout(id)
  }, [statusMessage])

  return (
    <footer className="bottom-bar">
      <button
        className={`run-button${isRunning ? ' running' : ''}`}
        type="button"
        onClick={onRun}
        disabled={isRunning}
      >
        {isRunning ? (
          <>
            <span className="run-spinner" aria-hidden />
            <span>Running...</span>
          </>
        ) : (
          <>
            <span aria-hidden>▶</span>
            <span>Run</span>
          </>
        )}
      </button>
      <button
        className="hint-button"
        type="button"
        onClick={onHintToggle}
        disabled={hintDisabled}
      >
        Hint
      </button>
      <div
        className={`status-message${statusClass}${statusVisible ? '' : ' hidden'}`}
      >
        {statusMessage}
      </div>
    </footer>
  )
}
