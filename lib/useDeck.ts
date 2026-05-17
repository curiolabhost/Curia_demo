'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lesson } from './lessons'
import type { Deck, SlideItem } from './deckTypes'
import { getDeck, putDeck } from './deckClient'

function buildDefaultDeck(lesson: Lesson): Deck {
  const items: SlideItem[] = []
  lesson.content.forEach((_, i) =>
    items.push({ type: 'content', index: i, enabled: true }),
  )
  lesson.exercises.forEach((_, i) =>
    items.push({ type: 'exercise', index: i, enabled: true }),
  )
  return items
}

function storageKey(lessonId: string) {
  return `curia-deck-${lessonId}`
}

const DEBOUNCE_MS = 800

export function useDeck(lesson: Lesson, classroomId: string | null) {
  const [deck, setDeck] = useState<Deck>(() => buildDefaultDeck(lesson))
  const [saving, setSaving] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeckRef = useRef<Deck | null>(null)
  const classroomIdRef = useRef(classroomId)
  const lessonIdRef = useRef(lesson.id)

  useEffect(() => {
    classroomIdRef.current = classroomId
    lessonIdRef.current = lesson.id
  }, [classroomId, lesson.id])

  const flushPut = useCallback(async (cid: string, lid: string, slides: Deck) => {
    setSaving(true)
    try {
      await putDeck(cid, lid, slides)
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (classroomId === null) {
      setDeck(buildDefaultDeck(lesson))
      try {
        const raw = localStorage.getItem(storageKey(lesson.id))
        if (raw && !cancelled) setDeck(JSON.parse(raw))
      } catch {}
      return () => {
        cancelled = true
      }
    }

    setDeck(buildDefaultDeck(lesson))
    ;(async () => {
      const { deck: remote } = await getDeck(classroomId, lesson.id)
      if (cancelled) return
      if (remote) setDeck(remote as Deck)
    })()

    return () => {
      cancelled = true
    }
  }, [lesson, classroomId])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
        const pending = pendingDeckRef.current
        const cid = classroomIdRef.current
        const lid = lessonIdRef.current
        if (pending && cid) {
          void putDeck(cid, lid, pending)
        }
      }
    }
  }, [])

  const saveDeck = useCallback(
    (next: Deck) => {
      setDeck(next)

      if (classroomId === null) {
        try {
          localStorage.setItem(storageKey(lesson.id), JSON.stringify(next))
        } catch {}
        return
      }

      pendingDeckRef.current = next
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        const pending = pendingDeckRef.current
        pendingDeckRef.current = null
        if (pending) {
          void flushPut(classroomId, lesson.id, pending)
        }
      }, DEBOUNCE_MS)
    },
    [lesson.id, classroomId, flushPut],
  )

  return { deck, saveDeck, saving }
}
