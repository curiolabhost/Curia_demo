export type LiveConfig = { enabled: boolean; seconds: number }

export type SlideItem =
  | { type: 'content'; index: number; enabled: boolean }
  | { type: 'exercise'; index: number; enabled: boolean; live?: LiveConfig }

export type Deck = SlideItem[]

export const DEFAULT_LIVE_SECONDS = 60

// Exercise formats that can be auto-graded in a live Pulse round.
export const LIVE_SUPPORTED_FORMATS = new Set([
  'multiple-choice',
  'fill-blank',
  'fill-blank-typed',
  'drag-reorder',
  'sort-buckets',
])

export function isLiveSupportedFormat(format: string): boolean {
  return LIVE_SUPPORTED_FORMATS.has(format)
}
