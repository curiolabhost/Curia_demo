import * as PIXI from 'pixi.js'
import type { TiledMap } from './types'

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000
const FLIPPED_VERTICALLY_FLAG = 0x40000000
const FLIPPED_DIAGONALLY_FLAG = 0x20000000
const GID_MASK = 0x1fffffff

export function renderTileLayers(
  map: TiledMap,
  gidToTexture: Map<number, PIXI.Texture>,
): PIXI.Container {
  const worldContainer = new PIXI.Container()
  worldContainer.label = 'World'

  const tileW = map.tilewidth
  const tileH = map.tileheight
  const mapW = map.width

  for (const layer of map.layers) {
    if (layer.type !== 'tilelayer') continue
    if (layer.visible === false) continue

    const layerContainer = new PIXI.Container()
    layerContainer.label = layer.name
    layerContainer.alpha = layer.opacity ?? 1
    if (layer.name === 'Ocean') {
      layerContainer.tint = 0xCCDDEE
      layerContainer.alpha = (layer.opacity ?? 1) * 0.98
    }

    for (let i = 0; i < layer.data.length; i++) {
      const rawGid = layer.data[i] >>> 0
      if (rawGid === 0) continue

      const flippedH = (rawGid & FLIPPED_HORIZONTALLY_FLAG) !== 0
      const flippedV = (rawGid & FLIPPED_VERTICALLY_FLAG) !== 0
      const flippedD = (rawGid & FLIPPED_DIAGONALLY_FLAG) !== 0
      const gid = rawGid & GID_MASK

      const texture = gidToTexture.get(gid)
      if (!texture) continue

      const col = i % mapW
      const row = Math.floor(i / mapW)
      const sprite = new PIXI.Sprite(texture)

      if (flippedH || flippedV || flippedD) {
        sprite.anchor.set(0.5, 0.5)
        sprite.x = col * tileW + tileW / 2
        sprite.y = row * tileH + tileH / 2

        if (flippedD && flippedH && flippedV) {
          // anti-diagonal flip
          sprite.rotation = Math.PI / 2
          sprite.scale.x = -1
        } else if (flippedD && flippedH) {
          sprite.rotation = Math.PI / 2
        } else if (flippedD && flippedV) {
          sprite.rotation = -Math.PI / 2
        } else if (flippedD) {
          // main-diagonal flip
          sprite.rotation = Math.PI / 2
          sprite.scale.y = -1
        } else if (flippedH && flippedV) {
          sprite.rotation = Math.PI
        } else if (flippedH) {
          sprite.scale.x = -1
        } else if (flippedV) {
          sprite.scale.y = -1
        }
      } else {
        sprite.x = col * tileW
        sprite.y = row * tileH
      }

      layerContainer.addChild(sprite)
    }

    worldContainer.addChild(layerContainer)
  }

  return worldContainer
}
