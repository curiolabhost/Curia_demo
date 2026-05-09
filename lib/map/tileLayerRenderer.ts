import * as PIXI from 'pixi.js'
import type { TiledMap } from './types'

// Tiled encodes tile flip/rotation in the high bits of each gid. We strip them
// to get the actual tile id; rotation is not applied in this version.
const FLIP_FLAGS = 0xe0000000

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
      const rawGid = layer.data[i]
      if (rawGid === 0) continue
      const gid = rawGid & ~FLIP_FLAGS
      const texture = gidToTexture.get(gid)
      if (!texture) continue

      const col = i % mapW
      const row = Math.floor(i / mapW)
      const sprite = new PIXI.Sprite(texture)
      sprite.x = col * tileW
      sprite.y = row * tileH
      layerContainer.addChild(sprite)
    }

    worldContainer.addChild(layerContainer)
  }

  return worldContainer
}
