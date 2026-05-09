export type TiledProperty = {
  name: string
  type: string
  value: string | number | boolean
}

export type TiledObject = {
  id: number
  name: string
  x: number
  y: number
  visible?: boolean
  properties?: TiledProperty[]
}

export type TiledTileLayer = {
  type: 'tilelayer'
  name: string
  data: number[]
  width: number
  height: number
  visible: boolean
  opacity: number
}

export type TiledObjectGroup = {
  type: 'objectgroup'
  name: string
  objects: TiledObject[]
  visible: boolean
}

export type TiledLayer = TiledTileLayer | TiledObjectGroup

export type TiledTileset = {
  firstgid: number
  source: string
}

export type TiledMap = {
  width: number
  height: number
  tilewidth: number
  tileheight: number
  layers: TiledLayer[]
  tilesets: TiledTileset[]
}

export type Slot = {
  id: number
  name: string
  x: number
  y: number
  slotIndex: number
  door: string
  exitWaypoint?: string
}
