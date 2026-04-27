'use client'

import { useEffect, useRef, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { LessonContent } from './LessonContent'

type SidebarProps = {
  lesson?: Lesson
}

const FADE_MS = 150

export function Sidebar({ lesson }: SidebarProps) {
  const [renderedLesson, setRenderedLesson] = useState<Lesson | undefined>(lesson)
  const [contentFading, setContentFading] = useState(false)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lesson?.id === renderedLesson?.id) return
    setContentFading(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = setTimeout(() => {
      setRenderedLesson(lesson)
      setContentFading(false)
    }, FADE_MS)
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [lesson, renderedLesson?.id])

  return (
    <aside className="sidebar">
      <div className={`sidebar-content${contentFading ? ' fading' : ''}`}>
        {renderedLesson ? (
          <LessonContent lesson={renderedLesson} />
        ) : (
          <div className="empty-state-block">
            Select a lesson from the nav to begin.
          </div>
        )}
      </div>
    </aside>
  )
}
