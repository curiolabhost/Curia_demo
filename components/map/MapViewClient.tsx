'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import { getIslandTemplate } from '@/content/map/sessionConfig'
import { getLessonById, getLessonsBySession } from '@/lib/lessons'
import { extractSlots } from '@/lib/map/extractSlots'
import { setupPanZoom } from '@/lib/map/panZoom'
import { assertLessonsOrdered, pickSlots } from '@/lib/map/pickSlots'
import { applySessionLessonFilter } from '@/lib/map/sessionFilter'
import { renderTileLayers } from '@/lib/map/tileLayerRenderer'
import { loadTilesets } from '@/lib/map/tilesetLoader'
import { renderVillages, type VillagePlacement } from '@/lib/map/villageRenderer'
import { LessonPopup } from './LessonPopup'

type MapViewClientProps = {
  sessionId: string
  currentLessonId: string
  onNavigate: (lessonId: string, exerciseIndex: number) => void
}

const INITIAL_SCALE = 1.5

export default function MapViewClient({
  sessionId,
  currentLessonId,
  onNavigate,
}: MapViewClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  // Latest onNavigate, read inside the Pixi click handler so re-renders of the
  // parent don't tear down the canvas.
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate
  // Stable ref so the Pixi click handler can open the popup without
  // re-running the init effect on every render.
  const openPopupRef = useRef(setSelectedLessonId)
  openPopupRef.current = setSelectedLessonId

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    const map = getIslandTemplate(sessionId)
    if (!map) return

    let disposed = false
    // Outer `app` and `canvas` are only assigned once init() has fully
    // succeeded and the canvas is mounted, so cleanup can rely on them being
    // a consistent pair. Strict Mode in dev runs cleanup between mount and
    // remount, which can fire while init() is still awaiting; the disposed
    // flag inside init() handles teardown for that case.
    let app: PIXI.Application | null = null
    let canvas: HTMLCanvasElement | null = null
    let resizeObserver: ResizeObserver | null = null
    let cleanupPanZoom: (() => void) | null = null

    const init = async () => {
      const sessionGroups = getLessonsBySession()
      const group = sessionGroups.find((g) => g.sessionId === sessionId)
      const rawLessons = group?.lessons ?? []
      const lessons = applySessionLessonFilter(sessionId, rawLessons)
      assertLessonsOrdered(lessons)

      const allSlots = extractSlots(map)
      const selected = pickSlots(allSlots, lessons.length)
      const placements: VillagePlacement[] = selected.map((slot, i) => ({
        slot,
        lessonId: lessons[i].id,
      }))

      const initialW = host.clientWidth || 1
      const initialH = host.clientHeight || 1

      const newApp = new PIXI.Application()
      await newApp.init({
        width: initialW,
        height: initialH,
        backgroundAlpha: 0,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      if (disposed) {
        newApp.destroy(true, { children: true, texture: false })
        return
      }

      const newCanvas = newApp.canvas
      host.appendChild(newCanvas)

      const viewport = new PIXI.Container()
      newApp.stage.addChild(viewport)

      const gidToTexture = await loadTilesets(map)
      if (disposed) {
        newApp.destroy(true, { children: true, texture: false })
        if (newCanvas.parentNode) newCanvas.parentNode.removeChild(newCanvas)
        return
      }

      const world = renderTileLayers(map, gidToTexture)
      viewport.addChild(world)

      const panZoom = setupPanZoom(newCanvas, viewport, INITIAL_SCALE)

      const villages = await renderVillages(
        placements,
        (lessonId) => openPopupRef.current(lessonId),
        panZoom.dragInfo,
      )
      if (disposed) {
        panZoom.cleanup()
        newApp.destroy(true, { children: true, texture: false })
        if (newCanvas.parentNode) newCanvas.parentNode.removeChild(newCanvas)
        return
      }
      world.addChild(villages.container)

      const activeSlot = villages.slotByLessonId.get(currentLessonId)
      const centerX = activeSlot
        ? activeSlot.x
        : (map.width * map.tilewidth) / 2
      const centerY = activeSlot
        ? activeSlot.y
        : (map.height * map.tileheight) / 2
      panZoom.centerOn(centerX, centerY)

      const observer = new ResizeObserver(() => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (w > 0 && h > 0) newApp.renderer.resize(w, h)
      })
      observer.observe(host)

      app = newApp
      canvas = newCanvas
      resizeObserver = observer
      cleanupPanZoom = panZoom.cleanup
    }

    init().catch((err) => {
      console.error('[MapView] init failed', err)
    })

    return () => {
      disposed = true
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (cleanupPanZoom) {
        cleanupPanZoom()
        cleanupPanZoom = null
      }
      if (app && canvas) {
        app.destroy(true, { children: true, texture: false })
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
        app = null
        canvas = null
      }
    }
  }, [sessionId, currentLessonId])

  const closePopup = useCallback(() => setSelectedLessonId(null), [])
  const openLesson = useCallback(
    (id: string) => {
      setSelectedLessonId(null)
      onNavigateRef.current(id, 0)
    },
    [],
  )
  const selectExercise = useCallback(
    (id: string, exIndex: number) => {
      setSelectedLessonId(null)
      onNavigateRef.current(id, exIndex)
    },
    [],
  )
  const selectChallenge = useCallback(
    (id: string, _challengeIndex: number) => {
      setSelectedLessonId(null)
      onNavigateRef.current(id, 0)
    },
    [],
  )

  const selectedLesson = selectedLessonId
    ? (getLessonById(selectedLessonId) ?? null)
    : null

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', overflow: 'hidden' }}
      />
      {selectedLesson ? (
        <LessonPopup
          lesson={selectedLesson}
          onClose={closePopup}
          onOpenLesson={openLesson}
          onSelectExercise={selectExercise}
          onSelectChallenge={selectChallenge}
        />
      ) : null}
    </>
  )
}
