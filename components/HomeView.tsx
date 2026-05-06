'use client'

import { useMemo, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { getLessonsBySession } from '@/lib/lessons'
import type { ItemStatus, LessonProgress } from '@/lib/progress'
import { getProgress } from '@/lib/progress'

type HomeViewProps = {
  allLessons: Lesson[]
  activeLessonId: string
  activeExerciseIndex: number
  homeExpanded: boolean
  setHomeExpanded: (v: boolean) => void
  onNavigate: (lessonId: string, exerciseIndex: number) => void
  onClose: () => void
}

type Tab = 'list' | 'map'

function StatusDot() {
  return <span className="list-chip-dot" aria-hidden />
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function MapIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  )
}

function ExpandIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  )
}

function CollapseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14h6m0 0v6m0-6l-7 7" />
      <path d="M20 10h-6m0 0V4m0 6l7-7" />
    </svg>
  )
}

function chipExerciseClass(status: ItemStatus): string {
  return `list-chip ${status}${status !== 'locked' ? ' clickable' : ''}`
}

function chipChallengeClass(status: ItemStatus): string {
  if (status === 'done') return 'list-chip ch-done'
  return 'list-chip ch-locked'
}

export function HomeView({
  allLessons,
  activeLessonId,
  homeExpanded,
  setHomeExpanded,
  onNavigate,
}: HomeViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('list')

  const sessionGroups = useMemo(() => getLessonsBySession(), [])
  const progressData = useMemo(() => getProgress(allLessons), [allLessons])
  const progressByLessonId = useMemo(() => {
    const map: Record<string, LessonProgress> = {}
    for (const p of progressData) map[p.lessonId] = p
    return map
  }, [progressData])

  const { totalExercises, doneExercises } = useMemo(() => {
    let total = 0
    let done = 0
    for (const p of progressData) {
      total += p.exerciseStatuses.length
      for (const s of p.exerciseStatuses) {
        if (s === 'done') done += 1
      }
    }
    return { totalExercises: total, doneExercises: done }
  }, [progressData])

  const percent = totalExercises > 0 ? Math.round((doneExercises / totalExercises) * 100) : 0

  return (
    <div className="home-view">
      <div className="home-header">
        <span className="home-header-title">Learning Map</span>
        <div className="home-progress-pill">
          <div className="home-progress-bar-bg">
            <div
              className="home-progress-bar-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="home-progress-label">{percent}% complete</span>
        </div>
        <button
          type="button"
          className="home-expand-btn"
          onClick={() => setHomeExpanded(!homeExpanded)}
          aria-label={homeExpanded ? 'Collapse home view' : 'Expand home view'}
          title={homeExpanded ? 'Collapse' : 'Expand'}
        >
          {homeExpanded ? <CollapseIcon /> : <ExpandIcon />}
        </button>
      </div>

      <div className="home-tab-bar">
        <button
          type="button"
          className={`home-tab${activeTab === 'list' ? ' active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          List
        </button>
        <button
          type="button"
          className={`home-tab${activeTab === 'map' ? ' active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          Map
        </button>
      </div>

      <div className="home-content">
        {activeTab === 'map' ? (
          <div className="home-map-placeholder">
            <span className="home-map-placeholder-icon">
              <MapIcon size={32} />
            </span>
            <span className="home-map-placeholder-text">Game map coming soon</span>
            <span className="home-map-placeholder-sub">
              The interactive island map is being built.
            </span>
          </div>
        ) : (
          <div style={{ padding: '0 0 40px' }}>
            {sessionGroups.map((group) => {
              const exerciseTotal = group.lessons.reduce(
                (sum, l) => sum + l.exercises.length,
                0,
              )
              return (
                <div key={group.sessionId} className="list-session-block">
                  <div className="list-session-header">
                    <span className="list-session-tag">{group.sessionLabel}</span>
                    <span className="list-session-name">{group.sessionLabel}</span>
                    <span className="list-session-line" aria-hidden />
                    <span className="list-session-count">
                      {group.lessons.length} lessons · {exerciseTotal} exercises total
                    </span>
                  </div>

                  {group.lessons.map((lesson, lessonIdx) => {
                    const progress = progressByLessonId[lesson.id]
                    if (!progress) return null
                    const isActive = lesson.id === activeLessonId
                    const isLocked = progress.lessonStatus === 'locked'
                    const isDone = progress.lessonStatus === 'done'
                    const cardClass = [
                      'list-lesson-card',
                      isActive ? 'active-lesson' : '',
                      isLocked ? 'locked-lesson' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    const totalEx = progress.exerciseStatuses.length
                    const doneEx = progress.exerciseStatuses.filter(
                      (s) => s === 'done',
                    ).length

                    let metaText = ''
                    if (progress.lessonStatus === 'done') {
                      metaText = `${totalEx} / ${totalEx} done`
                    } else if (progress.lessonStatus === 'active') {
                      metaText = `${doneEx} / ${totalEx} done · in progress`
                    } else {
                      metaText = 'locked'
                    }

                    let iconContent: React.ReactNode = null
                    let iconClass = 'list-lesson-icon '
                    if (isDone) {
                      iconClass += 'done'
                      iconContent = '✓'
                    } else if (isLocked) {
                      iconClass += 'locked'
                      iconContent = <LockIcon size={14} />
                    } else {
                      iconClass += 'active'
                      iconContent = String(lessonIdx + 1)
                    }

                    const challengeStatuses = progress.challengeStatuses
                    const hasChallenges = challengeStatuses.length > 0

                    return (
                      <div key={lesson.id} className={cardClass}>
                        <div className="list-lesson-header">
                          <div className={iconClass}>{iconContent}</div>
                          <div className="list-lesson-title">{lesson.title}</div>
                          <div className="list-lesson-meta">{metaText}</div>
                        </div>
                        <div className="list-chips-row">
                          {progress.exerciseStatuses.map((status, exIdx) => {
                            const clickable = status !== 'locked'
                            return (
                              <button
                                key={`ex-${exIdx}`}
                                type="button"
                                className={chipExerciseClass(status)}
                                onClick={
                                  clickable
                                    ? () => onNavigate(lesson.id, exIdx)
                                    : undefined
                                }
                                disabled={!clickable}
                                aria-label={`Exercise ${exIdx + 1} ${status}`}
                              >
                                <StatusDot />
                                <span>E{exIdx + 1}</span>
                              </button>
                            )
                          })}

                          {hasChallenges ? (
                            <>
                              <span className="list-chips-div" aria-hidden />
                              <span className="list-chips-section-label">
                                Challenges
                              </span>
                              {challengeStatuses.map((status, chIdx) => (
                                <span
                                  key={`ch-${chIdx}`}
                                  className={chipChallengeClass(status)}
                                  aria-label={`Challenge ${chIdx + 1} ${status}`}
                                >
                                  <StatusDot />
                                  <span>C{chIdx + 1}</span>
                                </span>
                              ))}
                            </>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
