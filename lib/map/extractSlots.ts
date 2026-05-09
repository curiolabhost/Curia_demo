import type { Slot, TiledMap, TiledObject, TiledObjectGroup } from './types'

function getProp<T = unknown>(obj: TiledObject, name: string): T | undefined {
  const p = obj.properties?.find((p) => p.name === name)
  return p ? (p.value as T) : undefined
}

function isSlotLayer(layer: TiledObjectGroup): boolean {
  const ln = layer.name.toLowerCase()
  return ln.includes('slot') && !ln.includes('path')
}

export function extractSlots(map: TiledMap): Slot[] {
  const slots: Slot[] = []
  for (const layer of map.layers) {
    if (layer.type !== 'objectgroup') continue
    if (layer.visible === false) continue
    if (!isSlotLayer(layer)) continue

    for (const obj of layer.objects) {
      const door = getProp<string>(obj, 'door')
      const slotIndex = getProp<number>(obj, 'slotIndex')
      if (door === undefined || slotIndex === undefined) continue
      slots.push({
        id: obj.id,
        name: obj.name,
        x: obj.x,
        y: obj.y,
        slotIndex,
        door,
        exitWaypoint: getProp<string>(obj, 'exitWaypoint'),
      })
    }
  }
  return slots
}
