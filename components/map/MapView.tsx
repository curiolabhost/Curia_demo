'use client'

import dynamic from 'next/dynamic'
import { getIslandTemplateName } from '@/content/map/sessionConfig'

const MapViewClient = dynamic(() => import('./MapViewClient'), {
  ssr: false,
  loading: () => (
    <div className="map-loading" aria-live="polite">
      Loading map…
    </div>
  ),
})

type MapViewProps = {
  currentLessonId: string
  onNavigate: (lessonId: string, exerciseIndex: number) => void
}

export function MapView({ currentLessonId, onNavigate }: MapViewProps) {
  const sessionId = currentLessonId.split('-')[0]
  const templateName = getIslandTemplateName(sessionId)

  if (!templateName) {
    return (
      <div className="map-empty">
        <div className="map-empty-title">
          Island for {sessionId.toUpperCase()} is coming soon.
        </div>
        <div className="map-empty-sub">
          Use the List view to access these lessons.
        </div>
      </div>
    )
  }

  return (
    <div className="map-canvas-wrapper">
      <MapViewClient
        sessionId={sessionId}
        currentLessonId={currentLessonId}
        onNavigate={onNavigate}
      />
    </div>
  )
}
