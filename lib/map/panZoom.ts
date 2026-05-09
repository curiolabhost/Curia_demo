import type * as PIXI from 'pixi.js'

export type DragInfo = {
  // True for the duration of a pointer interaction that has moved past the
  // click threshold. Reset to false on pointerdown so click handlers on
  // sprites can short-circuit when this is false.
  wasDrag: boolean
}

export type PanZoomHandle = {
  cleanup: () => void
  centerOn: (worldX: number, worldY: number) => void
  dragInfo: DragInfo
}

const ZOOM_MIN = 0.3
const ZOOM_MAX = 4
const CLICK_DRAG_THRESHOLD_PX = 4

export function setupPanZoom(
  canvas: HTMLCanvasElement,
  viewport: PIXI.Container,
  initialScale: number,
): PanZoomHandle {
  viewport.scale.set(initialScale)
  canvas.style.touchAction = 'none'
  canvas.style.cursor = 'grab'

  const dragInfo: DragInfo = { wasDrag: false }

  let dragPointerId: number | null = null
  let dragStart: {
    px: number
    py: number
    vx: number
    vy: number
  } | null = null

  const onPointerDown = (e: PointerEvent) => {
    dragPointerId = e.pointerId
    dragStart = {
      px: e.clientX,
      py: e.clientY,
      vx: viewport.x,
      vy: viewport.y,
    }
    dragInfo.wasDrag = false
    canvas.setPointerCapture(e.pointerId)
    canvas.style.cursor = 'grabbing'
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== dragPointerId || !dragStart) return
    const dx = e.clientX - dragStart.px
    const dy = e.clientY - dragStart.py
    if (
      !dragInfo.wasDrag &&
      Math.abs(dx) + Math.abs(dy) > CLICK_DRAG_THRESHOLD_PX
    ) {
      dragInfo.wasDrag = true
    }
    viewport.x = dragStart.vx + dx
    viewport.y = dragStart.vy + dy
  }

  const endDrag = (e: PointerEvent) => {
    if (e.pointerId !== dragPointerId) return
    dragPointerId = null
    dragStart = null
    canvas.style.cursor = 'grab'
  }

  const zoomAt = (newScale: number, screenX: number, screenY: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale))
    const wx = (screenX - viewport.x) / viewport.scale.x
    const wy = (screenY - viewport.y) / viewport.scale.y
    viewport.scale.set(clamped)
    viewport.x = screenX - wx * clamped
    viewport.y = screenY - wy * clamped
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const factor = Math.exp(-e.deltaY * 0.0015)
    zoomAt(viewport.scale.x * factor, sx, sy)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endDrag)
  canvas.addEventListener('pointercancel', endDrag)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  const centerOn = (worldX: number, worldY: number) => {
    const rect = canvas.getBoundingClientRect()
    viewport.x = rect.width / 2 - worldX * viewport.scale.x
    viewport.y = rect.height / 2 - worldY * viewport.scale.y
  }

  return {
    cleanup: () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endDrag)
      canvas.removeEventListener('pointercancel', endDrag)
      canvas.removeEventListener('wheel', onWheel)
    },
    centerOn,
    dragInfo,
  }
}
