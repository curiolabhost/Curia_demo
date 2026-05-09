import * as PIXI from 'pixi.js'
import { slotHash } from './slotHash'
import type { Slot } from './types'
import type { DragInfo } from './panZoom'

const VARIANT_MAX = 10
const HOP_HEIGHT_PX = 10
const HOP_DURATION_MS = 350

async function loadVariant(door: string, n: number): Promise<PIXI.Texture | null> {
  const path = `/map/villages/village-${door}-${n}.png`
  try {
    const tex = (await PIXI.Assets.load(path)) as PIXI.Texture
    tex.source.scaleMode = 'nearest'
    return tex
  } catch {
    return null
  }
}

async function buildDoorPools(
  doors: Set<string>,
): Promise<Map<string, PIXI.Texture[]>> {
  const pools = new Map<string, PIXI.Texture[]>()
  await Promise.all(
    Array.from(doors, async (door) => {
      const variants = await Promise.all(
        Array.from({ length: VARIANT_MAX }, (_, i) => loadVariant(door, i + 1)),
      )
      pools.set(
        door,
        variants.filter((t): t is PIXI.Texture => t !== null),
      )
    }),
  )
  return pools
}

export type VillagePlacement = {
  slot: Slot
  lessonId: string
}

export type RenderedVillages = {
  container: PIXI.Container
  // The slot whose lesson matches this id, useful for camera centering.
  slotByLessonId: Map<string, Slot>
}

export async function renderVillages(
  placements: VillagePlacement[],
  onClick: (lessonId: string) => void,
  dragInfo: DragInfo,
): Promise<RenderedVillages> {
  const container = new PIXI.Container()
  container.label = 'Villages'
  const slotByLessonId = new Map<string, Slot>()

  const doors = new Set<string>()
  for (const p of placements) doors.add(p.slot.door)

  const doorPools = await buildDoorPools(doors)

  for (const { slot, lessonId } of placements) {
    const pool = doorPools.get(slot.door)
    if (!pool || pool.length === 0) continue

    const tex =
      pool.length === 1
        ? pool[0]
        : pool[slotHash(slot.slotIndex) % pool.length]

    const sprite = new PIXI.Sprite(tex)
    sprite.anchor.set(0.5, 1)
    sprite.x = slot.x + 8
    sprite.y = slot.y + 40
    sprite.eventMode = 'static'
    sprite.cursor = 'pointer'

    const baseY = sprite.y
    let hopStart: number | null = null

    const animate = (now: number) => {
      if (sprite.destroyed || hopStart === null) return
      const elapsed = now - hopStart
      if (elapsed >= HOP_DURATION_MS) {
        sprite.y = baseY
        hopStart = null
        return
      }
      const progress = elapsed / HOP_DURATION_MS
      sprite.y = baseY - Math.sin(progress * Math.PI) * HOP_HEIGHT_PX
      requestAnimationFrame(animate)
    }

    sprite.on('pointerover', () => {
      if (hopStart !== null) return
      hopStart = performance.now()
      requestAnimationFrame(animate)
    })

    sprite.on('pointertap', () => {
      if (dragInfo.wasDrag) return
      onClick(lessonId)
    })
    container.addChild(sprite)
    slotByLessonId.set(lessonId, slot)
  }

  return { container, slotByLessonId }
}
