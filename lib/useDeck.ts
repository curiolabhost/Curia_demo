'use client'
import { useCallback, useEffect, useState } from 'react'
import type { Lesson } from './lessons'
import type { Deck, SlideItem } from './deckTypes'

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

export function useDeck(lesson: Lesson) {
  const [deck, setDeck] = useState<Deck>(() => buildDefaultDeck(lesson))

  useEffect(() => {
    setDeck(buildDefaultDeck(lesson))
    try {
      const raw = localStorage.getItem(storageKey(lesson.id))
      if (raw) setDeck(JSON.parse(raw))
    } catch {}
  }, [lesson])

  const saveDeck = useCallback(
    (next: Deck) => {
      setDeck(next)
      try {
        localStorage.setItem(storageKey(lesson.id), JSON.stringify(next))
      } catch {}
    },
    [lesson.id],
  )

  const resetDeck = useCallback(() => {
    const def = buildDefaultDeck(lesson)
    setDeck(def)
    try {
      localStorage.removeItem(storageKey(lesson.id))
    } catch {}
  }, [lesson])

  return { deck, saveDeck, resetDeck }
}
