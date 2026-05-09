import medium1 from './islands/medium-1.json'
import type { TiledMap } from '@/lib/map/types'

const TEMPLATES = {
  'medium-1': medium1 as unknown as TiledMap,
} as const

export type IslandTemplateName = keyof typeof TEMPLATES

const SESSION_TO_TEMPLATE: Record<string, IslandTemplateName> = {
  s2: 'medium-1',
}

export function getIslandTemplate(sessionId: string): TiledMap | null {
  const name = SESSION_TO_TEMPLATE[sessionId]
  if (!name) return null
  return TEMPLATES[name]
}

export function getIslandTemplateName(sessionId: string): IslandTemplateName | null {
  return SESSION_TO_TEMPLATE[sessionId] ?? null
}
