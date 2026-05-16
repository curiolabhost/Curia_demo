'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'

export type TypedFiller = {
  values: string[]
  setValueAt: (index: number, value: string) => void
  setAllValues: (next: string[]) => void
  handleChange: (index: number, value: string) => void
  handleKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    onEnter?: () => void,
  ) => void
  registerInputRef: (index: number, el: HTMLInputElement | null) => void
  focusBlank: (index: number) => void
  allFilled: boolean
  reset: () => void
}

export function useTypedFiller(
  _codeWithBlanks: string[],
  blankPlaceholders?: string[],
  blankWidths?: number[],
): TypedFiller {
  void blankPlaceholders
  void blankWidths

  const blankCount = _codeWithBlanks
    .map((line) => {
      let count = 0
      let i = 0
      while (true) {
        const found = line.indexOf('___BLANK___', i)
        if (found === -1) break
        count += 1
        i = found + '___BLANK___'.length
      }
      return count
    })
    .reduce((a, b) => a + b, 0)

  const [values, setValues] = useState<string[]>(() =>
    Array(blankCount).fill(''),
  )

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setValues(Array(blankCount).fill(''))
  }, [blankCount])

  const setValueAt = (index: number, value: string) => {
    setValues((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const setAllValues = (next: string[]) => {
    setValues(next)
  }

  const handleChange = (index: number, value: string) => {
    setValueAt(index, value)
  }

  const focusBlank = (index: number) => {
    const target = inputRefs.current[index]
    if (target) target.focus()
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    onEnter?: () => void,
  ) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    let next = -1
    for (let i = index + 1; i < blankCount; i += 1) {
      if ((values[i] ?? '').trim().length === 0) {
        next = i
        break
      }
    }
    if (next === -1) {
      for (let i = 0; i < index; i += 1) {
        if ((values[i] ?? '').trim().length === 0) {
          next = i
          break
        }
      }
    }
    if (next !== -1) {
      focusBlank(next)
    } else if (onEnter) {
      onEnter()
    }
  }

  const registerInputRef = (index: number, el: HTMLInputElement | null) => {
    inputRefs.current[index] = el
  }

  const allFilled = values.every((v) => v.trim().length > 0)

  const reset = () => {
    setValues(Array(blankCount).fill(''))
  }

  return {
    values,
    setValueAt,
    setAllValues,
    handleChange,
    handleKeyDown,
    registerInputRef,
    focusBlank,
    allFilled,
    reset,
  }
}
