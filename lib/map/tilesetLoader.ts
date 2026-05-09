import * as PIXI from 'pixi.js'
import type { TiledMap } from './types'

// Tiled JSONs reference tilesets via `.tsx` paths (Tiled's external tileset
// format). We don't ship those — we ship the underlying PNGs directly. This
// table translates each Tiled source path to the PNG we serve from /public/map.
const TILESET_PNG_FOR: Record<string, string> = {
  '../tiles/FDR_Dirt.tsx': '/map/tiles/FDR_Dirt.png',
  '../tiles/FDR_Water_Tiles.tsx': '/map/tiles/FDR_Water_Tiles.png',
  '../tiles/FDR_Village.tsx': '/map/tiles/FDR_Village.png',
  '../tiles/Trees, stumps and bushes.tsx':
    '/map/tiles/Trees, stumps and bushes.png',
  '../tiles/FDR_Groung_Tiles_A2.tsx': '/map/tiles/FDR_Groung_Tiles_A2.png',
  '../tiles/FDR_Ground.tsx': '/map/tiles/FDR_Ground.png',
}

function encodeAssetUrl(path: string): string {
  // Filenames may contain spaces and commas — encode the basename only so the
  // /map/tiles/ portion stays readable in devtools.
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash < 0) return encodeURIComponent(path)
  return path.slice(0, lastSlash + 1) + encodeURIComponent(path.slice(lastSlash + 1))
}

export async function loadTilesets(
  map: TiledMap,
): Promise<Map<number, PIXI.Texture>> {
  const gidToTexture = new Map<number, PIXI.Texture>()
  const tileW = map.tilewidth
  const tileH = map.tileheight

  for (const ts of map.tilesets) {
    const pngPath = TILESET_PNG_FOR[ts.source]
    if (!pngPath) {
      console.warn('[map] No PNG mapping for tileset', ts.source)
      continue
    }
    const baseTexture = (await PIXI.Assets.load(
      encodeAssetUrl(pngPath),
    )) as PIXI.Texture
    baseTexture.source.scaleMode = 'nearest'

    const cols = Math.floor(baseTexture.width / tileW)
    const rows = Math.floor(baseTexture.height / tileH)
    const tileCount = cols * rows

    for (let i = 0; i < tileCount; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      const frame = new PIXI.Rectangle(
        col * tileW,
        row * tileH,
        tileW,
        tileH,
      )
      const tileTexture = new PIXI.Texture({
        source: baseTexture.source,
        frame,
      })
      gidToTexture.set(ts.firstgid + i, tileTexture)
    }
  }

  return gidToTexture
}
