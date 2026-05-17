export type SlideItem =
  | { type: 'content'; index: number; enabled: boolean }
  | { type: 'exercise'; index: number; enabled: boolean }

export type Deck = SlideItem[]
