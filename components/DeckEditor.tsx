'use client'

import { useMemo } from 'react'
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
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'
import type { Lesson } from '@/lib/lessons'
import type { Deck, SlideItem } from '@/lib/deckTypes'

type DeckEditorProps = {
  lesson: Lesson
  deck: Deck
  onSave: (deck: Deck) => void
  onPresent: (deck: Deck) => void
  onClose: () => void
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

function PencilIcon({ size = 20 }: { size?: number }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
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

type SlideThumbnailProps = {
  id: string
  item: SlideItem
  lesson: Lesson
  onToggleEnabled: () => void
}

function SlideThumbnail({
  id,
  item,
  lesson,
  onToggleEnabled,
}: SlideThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    width: '200px',
    height: '130px',
    flexShrink: 0,
    zIndex: isDragging ? 2 : undefined,
    touchAction: 'none',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    border: '1.5px solid var(--border2)',
    borderRadius: '10px',
    background: 'var(--surface)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    cursor: isDragging ? 'grabbing' : 'grab',
    boxShadow: isDragging ? '0 6px 20px rgba(0,0,0,0.12)' : undefined,
    opacity: item.enabled ? 1 : 0.5,
  }

  let previewNode: React.ReactNode = null
  let labelText = ''
  let subLabelText = ''

  if (item.type === 'content') {
    const page = lesson.content[item.index]
    const heading = page?.heading?.trim() ?? ''
    labelText = `Page ${item.index + 1}`
    subLabelText = heading.length > 0 ? heading : '(no heading)'
    previewNode = heading.length > 0 ? (
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text2)',
          textAlign: 'center',
          padding: '0 8px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: 1.3,
        }}
      >
        {heading}
      </span>
    ) : (
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text3)',
          textAlign: 'center',
          padding: '0 8px',
        }}
      >
        Page {item.index + 1}
      </span>
    )
  } else {
    const exercise = lesson.exercises[item.index]
    const format = exercise?.format ?? 'code-editor'
    const task = exercise?.tasks?.[0] ?? ''
    labelText = `Exercise ${item.index + 1}`
    subLabelText = format
    previewNode = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: 'var(--text3)',
          padding: '0 8px',
          width: '100%',
        }}
      >
        <PencilIcon size={20} />
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          Exercise {item.index + 1}
        </span>
        {task.length > 0 ? (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              textAlign: 'center',
            }}
          >
            {task}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={wrapperStyle}>
      <div style={cardStyle} {...attributes} {...listeners}>
        <div
          style={{
            height: '80px',
            background: 'var(--surface2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {previewNode}
        </div>
        <div
          style={{
            height: '50px',
            padding: '8px 10px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text3)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {labelText}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subLabelText}
          </span>
        </div>
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
          position: 'absolute',
          bottom: '6px',
          right: '6px',
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
}: DeckEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const sortableIds = useMemo(() => deck.map(slideKey), [deck])

  const enabledCount = deck.filter((s) => s.enabled).length

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = sortableIds.indexOf(String(active.id))
    const to = sortableIds.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onSave(arrayMove(deck, from, to))
  }

  const handleToggle = (index: number) => {
    const next = deck.map((s, i) =>
      i === index ? { ...s, enabled: !s.enabled } : s,
    )
    onSave(next)
  }

  const handleReset = () => {
    onSave(buildDefaultDeck(lesson))
  }

  const handlePresentClick = () => {
    if (enabledCount === 0) return
    onPresent(deck)
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
          alignItems: 'flex-start',
          gap: '16px',
          padding: '32px 40px',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={horizontalListSortingStrategy}
          >
            {deck.map((item, i) => (
              <SlideThumbnail
                key={slideKey(item)}
                id={slideKey(item)}
                item={item}
                lesson={lesson}
                onToggleEnabled={() => handleToggle(i)}
              />
            ))}
          </SortableContext>
        </DndContext>
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
