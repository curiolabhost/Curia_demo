'use client'

import { useMemo, useState } from 'react'
import type { Lesson } from '@/lib/lessons'
import { getLessonsBySession } from '@/lib/lessons'
import type { ItemStatus, LessonProgress } from '@/lib/progress'
import { getProgress } from '@/lib/progress'
import { MapView } from './map/MapView'

type HomeViewProps = {
  allLessons: Lesson[]
  activeLessonId: string
  activeExerciseIndex: number
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
        <div
          className="home-progress-bar-bg"
          style={{ marginLeft: 'auto', alignSelf: 'center' }}
        >
          <div
            className="home-progress-bar-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span
          className="home-progress-label"
          style={{ marginLeft: 8, alignSelf: 'center' }}
        >
          {percent}% complete
        </span>
      </div>

      <div className="home-content">
        {activeTab === 'map' ? (
          <div className="home-map-host">
            <MapView currentLessonId={activeLessonId} onNavigate={onNavigate} />
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
