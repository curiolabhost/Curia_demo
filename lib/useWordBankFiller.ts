'use client'

import { useEffect, useState } from 'react'
import type { FillBlankToken } from './lessons'

export type WordBankFiller = {
  filled: (string | null)[]
  filledTokenIds: (string | null)[]
  usedTokenIds: Set<string>
  handleTokenClick: (tokenId: string, label: string) => void
  handleBlankClick: (blankIndex: number) => void
  allFilled: boolean
  reset: () => void
}

export function useWordBankFiller(
  _codeWithBlanks: string[],
  correctOrder: string[],
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

  const usedTokenIds = new Set(
    filledTokenIds.filter((id): id is string => id !== null),
  )

  const handleTokenClick = (tokenId: string, label: string) => {
    if (usedTokenIds.has(tokenId)) return
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

  const allFilled = filled.every((v) => v !== null)

  const reset = () => {
    setFilled(Array(blankCount).fill(null))
    setFilledTokenIds(Array(blankCount).fill(null))
  }

  return {
    filled,
    filledTokenIds,
    usedTokenIds,
    handleTokenClick,
    handleBlankClick,
    allFilled,
    reset,
  }
}
