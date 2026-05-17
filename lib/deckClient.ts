export type DeckSlideItem = {
  type: 'content' | 'exercise'
  index: number
  enabled: boolean
}

export async function getDeck(classroomId: string, lessonId: string): Promise<{
  ok: boolean
  deck: DeckSlideItem[] | null
}> {
  try {
    const res = await fetch(`/api/classroom/${classroomId}/decks/${lessonId}`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return { ok: false, deck: null }
    const data = await res.json()
    return { ok: true, deck: data.deck ?? null }
  } catch {
    return { ok: false, deck: null }
  }
}

export async function putDeck(classroomId: string, lessonId: string, slides: DeckSlideItem[]): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`/api/classroom/${classroomId}/decks/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ slides }),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}
