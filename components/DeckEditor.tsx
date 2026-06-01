'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import type { Lesson } from '@/lib/lessons'
import type { Deck, SlideItem } from '@/lib/deckTypes'
import { DEFAULT_LIVE_SECONDS, isLiveSupportedFormat } from '@/lib/deckTypes'
import { LessonContent } from '@/components/LessonContent'
import { ExercisePrompt } from '@/components/ExercisePrompt'
import { panelRegistry } from '@/components/exercise-panels'

type DeckEditorProps = {
  lesson: Lesson
  deck: Deck
  onSave: (deck: Deck) => void
  onPresent: (deck: Deck) => void
  onClose: () => void
  saving?: boolean
}

function buildDefaultDeck(lesson: Lesson): Deck {
  const items: SlideItem[] = []
  lesson.content.forEach((_, i) =>
    items.push({ type: 'content', index: i, enabled: true }),
  )
  lesson.exercises.forEach((_, i) =>
    items.push({ type: 'exercise', index: i, enabled: true }),
  )
  return items
}

function slideKey(item: SlideItem): string {
  return `slide-${item.type}-${item.index}`
}

function CheckmarkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

type SlideStripItemProps = {
  id: string
  item: SlideItem
  index: number
  lesson: Lesson
  isSelected: boolean
  onSelect: () => void
  onToggleEnabled: () => void
}

function SlideStripItem({
  id,
  item,
  index,
  lesson,
  isSelected,
  onSelect,
  onToggleEnabled,
}: SlideStripItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  let typeLabel = ''
  let titleText = ''
  if (item.type === 'content') {
    const page = lesson.content[item.index]
    const heading = page?.heading?.trim() ?? ''
    typeLabel = `Page ${item.index + 1}`
    titleText = heading.length > 0 ? heading : '(no heading)'
  } else {
    const exercise = lesson.exercises[item.index]
    const task = exercise?.tasks?.[0] ?? ''
    typeLabel = `Exercise ${item.index + 1}`
    titleText = task.length > 0 ? task : exercise?.format ?? 'exercise'
  }

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '100%',
    height: '80px',
    flexShrink: 0,
    zIndex: isDragging ? 2 : undefined,
    touchAction: 'none',
    boxSizing: 'border-box',
    borderRadius: '6px',
    border: isSelected
      ? '1.5px solid var(--accent)'
      : '1.5px solid var(--border2)',
    background: isSelected ? 'var(--accent-dim)' : 'var(--surface)',
    opacity: item.enabled ? 1 : 0.5,
    cursor: isDragging ? 'grabbing' : 'grab',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 8px',
  }

  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <span
        style={{
          width: '20px',
          flexShrink: 0,
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text3)',
        }}
      >
        {index + 1}
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--text3)',
            textTransform: 'uppercase',
          }}
        >
          {typeLabel}
          {item.type === 'exercise' && item.live?.enabled ? (
            <span
              style={{
                color: 'var(--accent)',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              ⚡ LIVE
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {titleText}
        </span>
      </div>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onToggleEnabled()
        }}
        aria-label={item.enabled ? 'Disable slide' : 'Enable slide'}
        aria-pressed={item.enabled}
        style={{
          width: '16px',
          height: '16px',
          padding: 0,
          border: 'none',
          borderRadius: '4px',
          background: item.enabled ? 'var(--accent)' : 'var(--border2)',
          color: 'var(--white)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {item.enabled ? <CheckmarkIcon /> : null}
      </button>
    </div>
  )
}

export function DeckEditor({
  lesson,
  deck,
  onSave,
  onPresent,
  onClose,
  saving = false,
}: DeckEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const sortableIds = useMemo(() => deck.map(slideKey), [deck])

  const enabledCount = deck.filter((s) => s.enabled).length

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    deck.length > 0 ? 0 : null,
  )

  useEffect(() => {
    if (deck.length === 0) {
      if (selectedIndex !== null) setSelectedIndex(null)
      return
    }
    if (selectedIndex === null || selectedIndex >= deck.length) {
      setSelectedIndex(deck.length - 1)
    }
  }, [deck.length, selectedIndex])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = sortableIds.indexOf(String(active.id))
    const to = sortableIds.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onSave(arrayMove(deck, from, to))
    if (selectedIndex === from) {
      setSelectedIndex(to)
    } else if (
      selectedIndex !== null &&
      from < selectedIndex &&
      to >= selectedIndex
    ) {
      setSelectedIndex(selectedIndex - 1)
    } else if (
      selectedIndex !== null &&
      from > selectedIndex &&
      to <= selectedIndex
    ) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const handleToggle = (index: number) => {
    const next = deck.map((s, i) =>
      i === index ? { ...s, enabled: !s.enabled } : s,
    )
    onSave(next)
    setSelectedIndex(index)
  }

  const handleReset = () => {
    const next = buildDefaultDeck(lesson)
    onSave(next)
    setSelectedIndex(next.length > 0 ? 0 : null)
  }

  const handlePresentClick = () => {
    if (enabledCount === 0) return
    onPresent(deck)
  }

  const handleLiveToggle = (index: number) => {
    const next = deck.map((s, i) => {
      if (i !== index || s.type !== 'exercise') return s
      const enabled = !s.live?.enabled
      return {
        ...s,
        live: { enabled, seconds: s.live?.seconds ?? DEFAULT_LIVE_SECONDS },
      }
    })
    onSave(next)
    setSelectedIndex(index)
  }

  const handleLiveSeconds = (index: number, seconds: number) => {
    const clamped = Math.max(5, Math.min(600, Math.round(seconds)))
    const next = deck.map((s, i) => {
      if (i !== index || s.type !== 'exercise') return s
      return { ...s, live: { enabled: s.live?.enabled ?? true, seconds: clamped } }
    })
    onSave(next)
  }

  const selectedLiveExercise =
    selectedIndex !== null &&
    selectedIndex < deck.length &&
    deck[selectedIndex].type === 'exercise'
      ? (() => {
          const it = deck[selectedIndex]
          const ex = lesson.exercises[it.index]
          const format = ex?.format ?? ''
          return isLiveSupportedFormat(format)
            ? { index: selectedIndex, item: it as Extract<SlideItem, { type: 'exercise' }> }
            : null
        })()
      : null

  const selectedItem =
    selectedIndex !== null && selectedIndex < deck.length
      ? deck[selectedIndex]
      : null

  let previewContent: React.ReactNode = null
  if (selectedItem) {
    if (selectedItem.type === 'content') {
      const page = lesson.content[selectedItem.index]
      if (page) {
        previewContent = (
          <div
            style={{
              padding: '40px',
              overflow: 'hidden',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <LessonContent
              page={page}
              isLastPage={false}
              lesson={lesson}
              variant="slide"
            />
          </div>
        )
      }
    } else {
      const exercise = lesson.exercises[selectedItem.index]
      if (exercise) {
        const format = exercise.format ?? 'code-editor'
        const Panel = panelRegistry[format]
        if (Panel) {
          previewContent = (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <ExercisePrompt
                exercises={lesson.exercises}
                activeIndex={selectedItem.index}
                hintVisible={false}
              />
              <div
                style={{
                  flex: 1,
                  padding: '16px 24px',
                  overflow: 'hidden',
                  boxSizing: 'border-box' as const,
                }}
              >
                <Panel
                  exercise={exercise}
                  onComplete={() => {}}
                  onCorrect={() => {}}
                />
              </div>
            </div>
          )
        }
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          height: '56px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--sans)',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {lesson.title}
          </span>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text3)',
            }}
          >
            Arrange slides then click Present
          </span>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px 8px',
              color: 'var(--text3)',
              fontFamily: 'var(--sans)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close deck editor"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              borderRadius: '6px',
              background: 'none',
              color: 'var(--text3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            width: '240px',
            flexShrink: 0,
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              {deck.map((item, i) => (
                <SlideStripItem
                  key={slideKey(item)}
                  id={slideKey(item)}
                  item={item}
                  index={i}
                  lesson={lesson}
                  isSelected={selectedIndex === i}
                  onSelect={() => setSelectedIndex(i)}
                  onToggleEnabled={() => handleToggle(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '40px',
            gap: '16px',
            boxSizing: 'border-box',
          }}
        >
          {selectedLiveExercise ? (
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: selectedLiveExercise.item.live?.enabled
                  ? 'var(--accent-dim)'
                  : 'var(--surface)',
                border: `1.5px solid ${
                  selectedLiveExercise.item.live?.enabled ? 'var(--accent)' : 'var(--border2)'
                }`,
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            >
              <button
                type="button"
                onClick={() => handleLiveToggle(selectedLiveExercise.index)}
                aria-pressed={selectedLiveExercise.item.live?.enabled ?? false}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--sans)',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: selectedLiveExercise.item.live?.enabled
                    ? 'var(--accent)'
                    : 'var(--border2)',
                  color: selectedLiveExercise.item.live?.enabled
                    ? 'var(--white)'
                    : 'var(--text2)',
                }}
              >
                ⚡ Live Pulse {selectedLiveExercise.item.live?.enabled ? 'on' : 'off'}
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
                {selectedLiveExercise.item.live?.enabled
                  ? 'Students answer live against a timer when you present this slide.'
                  : 'Turn on to run this exercise as a live Kahoot-style round.'}
              </span>
              {selectedLiveExercise.item.live?.enabled ? (
                <label
                  style={{
                    marginLeft: 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: 'var(--text2)',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  Timer
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={selectedLiveExercise.item.live?.seconds ?? DEFAULT_LIVE_SECONDS}
                    onChange={(e) =>
                      handleLiveSeconds(selectedLiveExercise.index, Number(e.target.value))
                    }
                    style={{
                      width: '64px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: '1px solid var(--border2)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'var(--mono)',
                      fontSize: '13px',
                    }}
                  />
                  sec
                </label>
              ) : null}
            </div>
          ) : null}

          {selectedItem ? (
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                minHeight: '400px',
                background: 'var(--surface)',
                borderRadius: '4px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                overflowY: 'auto',
                overflowX: 'hidden',
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            >
              {previewContent}
            </div>
          ) : (
            <div
              style={{
                color: 'var(--text3)',
                fontSize: '14px',
                fontFamily: 'var(--sans)',
              }}
            >
              Select a slide to preview
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          height: '56px',
          flexShrink: 0,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px',
          gap: '12px',
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            color: 'var(--text3)',
          }}
        >
          {enabledCount} slides in deck
          {saving ? (
            <span style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: '8px' }}>
              saving...
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 8px',
            color: 'var(--text3)',
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handlePresentClick}
          disabled={enabledCount === 0}
          style={{
            background: 'var(--accent)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'var(--sans)',
            cursor: enabledCount === 0 ? 'not-allowed' : 'pointer',
            opacity: enabledCount === 0 ? 0.5 : 1,
          }}
        >
          Present
        </button>
      </div>
    </div>
  )
}
