'use client'

import { useEffect, useState } from 'react'
import type { FillBlankToken } from './lessons'

export type WordBankFiller = {
  filled: (string | null)[]
  filledTokenIds: (string | null)[]
  handleTokenClick: (tokenId: string, label: string) => void
  handleBlankClick: (blankIndex: number) => void
  placeAt: (targetIndex: number, tokenId: string, label: string) => void
  clearBlank: (index: number) => void
  allFilled: boolean
  reset: () => void
}

export function useWordBankFiller(
  _codeWithBlanks: string[],
  correctOrder: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _tokenBank: FillBlankToken[],
): WordBankFiller {
  const blankCount = correctOrder.length

  const [filled, setFilled] = useState<(string | null)[]>(() =>
    Array(blankCount).fill(null),
  )
  const [filledTokenIds, setFilledTokenIds] = useState<(string | null)[]>(() =>
    Array(blankCount).fill(null),
  )

  useEffect(() => {
    setFilled(Array(blankCount).fill(null))
    setFilledTokenIds(Array(blankCount).fill(null))
  }, [blankCount])

  const handleTokenClick = (tokenId: string, label: string) => {
    const nextEmpty = filled.findIndex((v) => v === null)
    if (nextEmpty === -1) return
    const nextFilled = [...filled]
    const nextIds = [...filledTokenIds]
    nextFilled[nextEmpty] = label
    nextIds[nextEmpty] = tokenId
    setFilled(nextFilled)
    setFilledTokenIds(nextIds)
  }

  const handleBlankClick = (index: number) => {
    setFilled((prev) => {
      if (prev[index] === null) return prev
      const next = [...prev]
      next[index] = null
      return next
    })
    setFilledTokenIds((prev) => {
      if (prev[index] === null) return prev
      const next = [...prev]
      next[index] = null
      return next
    })
  }

  const placeAt = (targetIndex: number, tokenId: string, label: string) => {
    if (
      filled[targetIndex] === label &&
      filledTokenIds[targetIndex] === tokenId
    ) {
      return
    }
    const nextFilled = [...filled]
    const nextIds = [...filledTokenIds]
    nextFilled[targetIndex] = label
    nextIds[targetIndex] = tokenId
    setFilled(nextFilled)
    setFilledTokenIds(nextIds)
  }

  const clearBlank = (index: number) => handleBlankClick(index)

  const allFilled = filled.every((v) => v !== null)

  const reset = () => {
    setFilled(Array(blankCount).fill(null))
    setFilledTokenIds(Array(blankCount).fill(null))
  }

  return {
    filled,
    filledTokenIds,
    handleTokenClick,
    handleBlankClick,
    placeAt,
    clearBlank,
    allFilled,
    reset,
  }
}
