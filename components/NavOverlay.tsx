'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'

type NavOverlayProps = {
  lessons: Lesson[]
  activeLessonId: string
  completedIds?: string[]
  open: boolean
  onClose: () => void
}

const COLLAPSE_KEY_PREFIX = 'codelab__collapsed__'

function readCollapsed(session: string): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(`${COLLAPSE_KEY_PREFIX}${session}`) === '1'
}

function writeCollapsed(session: string, collapsed: boolean) {
  if (typeof window === 'undefined') return
  const key = `${COLLAPSE_KEY_PREFIX}${session}`
  if (collapsed) {
    window.localStorage.setItem(key, '1')
  } else {
    window.localStorage.removeItem(key)
  }
}

export function NavOverlay({
  lessons,
  activeLessonId,
  completedIds = [],
  open,
  onClose,
}: NavOverlayProps) {
  const router = useRouter()
  const completed = new Set(completedIds)
  const activeLesson = lessons.find((l) => l.id === activeLessonId)
  const activeItemRef = useRef<HTMLDivElement | null>(null)

  const groups: { session: string; items: Lesson[] }[] = []
  for (const lesson of lessons) {
    const last = groups[groups.length - 1]
    if (last && last.session === lesson.session) {
      last.items.push(lesson)
    } else {
      groups.push({ session: lesson.session, items: [lesson] })
    }
  }

  const activeSession = activeLesson?.session ?? ''

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initial: Record<string, boolean> = {}
    for (const g of groups) {
      initial[g.session] = readCollapsed(g.session)
    }
    setCollapsed(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeSession) return
    setCollapsed((prev) => {
      if (!prev[activeSession]) return prev
      writeCollapsed(activeSession, false)
      return { ...prev, [activeSession]: false }
    })
  }, [activeSession])

  useEffect(() => {
    if (!open) return
    activeItemRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [activeLessonId, open])

  const toggleCollapse = (session: string) => {
    if (session === activeSession) return
    setCollapsed((prev) => {
      const next = !prev[session]
      writeCollapsed(session, next)
      return { ...prev, [session]: next }
    })
  }

  const handleItemClick = (lessonId: string) => {
    router.push(`/learn/${lessonId}`)
    onClose()
  }

  return (
    <nav
      className={`nav-overlay${open ? ' open' : ''}`}
      aria-hidden={!open}
    >
      {groups.map((group, gi) => {
        const isCollapsed = !!collapsed[group.session]
        return (
          <div
            key={group.session}
            className="session-group"
            style={gi === 0 ? undefined : { marginTop: 8 }}
          >
            <div
              className="session-group-label"
              onClick={() => toggleCollapse(group.session)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggleCollapse(group.session)
                }
              }}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span className="session-group-arrow">
                {isCollapsed ? '▸' : '▾'}
              </span>
              {group.session.toUpperCase()}
            </div>
            {!isCollapsed &&
              group.items.map((lesson, idx) => {
                const step = String(idx + 1).padStart(2, '0')
                const isActive = lesson.id === activeLessonId
                const isDone = completed.has(lesson.id)
                const classes = [
                  'nav-item',
                  isActive ? 'active' : '',
                  isDone ? 'done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <div
                    key={lesson.id}
                    ref={isActive ? activeItemRef : null}
                    className={classes}
                    onClick={() => handleItemClick(lesson.id)}
                  >
                    <span className="nav-step">{step}</span>
                    <span className="nav-title">{lesson.title}</span>
                    <span className="nav-check">✓</span>
                  </div>
                )
              })}
          </div>
        )
      })}
    </nav>
  )
}
