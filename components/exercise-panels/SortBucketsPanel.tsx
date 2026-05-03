'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { PanelProps } from './index'
import type { SortItem as TSortItem } from '@/lib/lessons'

type AnswerState = 'idle' | 'correct' | 'wrong'
type ItemState = 'idle' | 'correct' | 'wrong'

const TRAY_ID = '__tray__'

type DraggableItemProps = {
  item: TSortItem
  state: ItemState
  isActive: boolean
  draggable: boolean
}

function DraggableItem({ item, state, isActive, draggable }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: item.id,
    disabled: !draggable,
  })
  const classes = ['sb-item']
  if (state === 'correct') classes.push('correct')
  else if (state === 'wrong') classes.push('wrong')
  if (isActive) classes.push('dragging')
  return (
    <div
      ref={setNodeRef}
      className={classes.join(' ')}
      {...listeners}
      {...attributes}
    >
      <span>{item.label}</span>
      {item.code ? <span className="mc-card-code" style={{ marginLeft: 8 }}>{item.code}</span> : null}
    </div>
  )
}

type BucketProps = {
  id: string
  label: string
  allCorrect: boolean
  children: React.ReactNode
}

function Bucket({ id, label, allCorrect, children }: BucketProps) {
  const { isOver, setNodeRef } = useDroppable({ id })
  const classes = ['sb-bucket']
  if (isOver) classes.push('drag-over')
  if (allCorrect) classes.push('all-correct')
  return (
    <div ref={setNodeRef} className={classes.join(' ')}>
      <div className="sb-bucket-label">{label}</div>
      {children}
    </div>
  )
}

type TrayProps = {
  isEmpty: boolean
  children: React.ReactNode
}

function Tray({ isEmpty, children }: TrayProps) {
  const { isOver, setNodeRef } = useDroppable({ id: TRAY_ID })
  const classes = ['sb-item-tray']
  if (isOver) classes.push('drag-over')
  return (
    <div ref={setNodeRef} className={classes.join(' ')}>
      {isEmpty ? (
        <span style={{ color: 'var(--text3)', fontSize: 12 }}>All items placed</span>
      ) : (
        children
      )}
    </div>
  )
}

export function SortBucketsPanel({ exercise, onComplete }: PanelProps) {
  const buckets = exercise.buckets ?? []
  const items = exercise.bucketItems ?? []

  const [placements, setPlacements] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {}
    items.forEach((item) => {
      init[item.id] = null
    })
    return init
  })
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>(() => {
    const init: Record<string, ItemState> = {}
    items.forEach((item) => {
      init[item.id] = 'idle'
    })
    return init
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const initPlacements: Record<string, string | null> = {}
    const initStates: Record<string, ItemState> = {}
    items.forEach((item) => {
      initPlacements[item.id] = null
      initStates[item.id] = 'idle'
    })
    setPlacements(initPlacements)
    setItemStates(initStates)
    setAnswerState('idle')
    setActiveId(null)
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [exercise])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const allPlaced = items.every((item) => placements[item.id] !== null && placements[item.id] !== undefined)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const id = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveId(null)
    if (itemStates[id] === 'correct') return
    if (!overId) return
    if (overId === TRAY_ID) {
      setPlacements((prev) => ({ ...prev, [id]: null }))
    } else if (buckets.some((b) => b.id === overId)) {
      setPlacements((prev) => ({ ...prev, [id]: overId }))
    }
  }

  const handleCheck = () => {
    if (answerState !== 'idle') return
    if (!allPlaced) return
    const nextStates: Record<string, ItemState> = {}
    let allCorrect = true
    items.forEach((item) => {
      const inBucket = placements[item.id]
      if (inBucket === item.correctBucketId) {
        nextStates[item.id] = 'correct'
      } else {
        nextStates[item.id] = 'wrong'
        allCorrect = false
      }
    })
    setItemStates(nextStates)
    if (allCorrect) {
      setAnswerState('correct')
    } else {
      setAnswerState('wrong')
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setPlacements((prev) => {
          const next = { ...prev }
          items.forEach((item) => {
            if (nextStates[item.id] === 'wrong') next[item.id] = null
          })
          return next
        })
        setItemStates((prev) => {
          const next = { ...prev }
          items.forEach((item) => {
            if (prev[item.id] === 'wrong') next[item.id] = 'idle'
          })
          return next
        })
        setAnswerState('idle')
        resetTimerRef.current = null
      }, 1200)
    }
  }

  const trayItems = items.filter((item) => placements[item.id] == null)
  const activeItem = items.find((i) => i.id === activeId) ?? null

  const bucketAllCorrect = (bucketId: string) => {
    const inBucket = items.filter((it) => placements[it.id] === bucketId)
    if (inBucket.length === 0) return false
    return inBucket.every((it) => itemStates[it.id] === 'correct')
  }

  return (
    <div className="panel-container">
      <h2 className="panel-heading">{exercise.title}</h2>
      <p className="panel-instruction">{exercise.tasks[0] ?? ''}</p>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="sb-board">
          <Tray isEmpty={trayItems.length === 0}>
            {trayItems.map((item) => (
              <DraggableItem
                key={item.id}
                item={item}
                state={itemStates[item.id] ?? 'idle'}
                isActive={activeId === item.id}
                draggable={itemStates[item.id] !== 'correct'}
              />
            ))}
          </Tray>

          <div className="sb-buckets">
            {buckets.map((bucket) => {
              const inBucket = items.filter((it) => placements[it.id] === bucket.id)
              return (
                <Bucket
                  key={bucket.id}
                  id={bucket.id}
                  label={bucket.label}
                  allCorrect={bucketAllCorrect(bucket.id)}
                >
                  {inBucket.map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      state={itemStates[item.id] ?? 'idle'}
                      isActive={activeId === item.id}
                      draggable={itemStates[item.id] !== 'correct'}
                    />
                  ))}
                </Bucket>
              )
            })}
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="sb-item">
              <span>{activeItem.label}</span>
              {activeItem.code ? (
                <span className="mc-card-code" style={{ marginLeft: 8 }}>{activeItem.code}</span>
              ) : null}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {answerState !== 'correct' ? (
        <button
          type="button"
          className="panel-check-btn"
          onClick={handleCheck}
          disabled={answerState !== 'idle' || !allPlaced}
        >
          Check Answer
        </button>
      ) : null}

      {answerState === 'wrong' ? (
        <div className="panel-feedback wrong">
          Some items are in the wrong bucket
        </div>
      ) : null}

      {answerState === 'correct' ? (
        <>
          <div className="panel-feedback correct">✓ All sorted correctly!</div>
          {exercise.explanation ? (
            <div className="panel-explanation">{exercise.explanation}</div>
          ) : null}
          <button
            type="button"
            className="panel-next-btn"
            onClick={() => onComplete(true)}
          >
            Next
          </button>
        </>
      ) : null}
    </div>
  )
}
