import { useCallback, useEffect, useState } from 'react'

export type LayoutMode = 'split' | 'expanded-left' | 'expanded-right'

const SPLIT_THRESHOLD = 1024

function getInitialMode(): LayoutMode {
  if (typeof window === 'undefined') return 'split'
  return window.innerWidth >= SPLIT_THRESHOLD ? 'split' : 'expanded-left'
}

export function useLayoutMode() {
  const [mode, setMode] = useState<LayoutMode>(getInitialMode)
  const [splitAllowed, setSplitAllowed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= SPLIT_THRESHOLD
  )

  useEffect(() => {
    function handleResize() {
      const wide = window.innerWidth >= SPLIT_THRESHOLD
      setSplitAllowed((prevWide) => {
        if (!wide) {
          setMode((prev) => (prev === 'split' ? 'expanded-left' : prev))
        } else if (!prevWide) {
          setMode((prev) => (prev === 'expanded-left' ? 'split' : prev))
        }
        return wide
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const expandLeft = useCallback(() => setMode('expanded-left'), [])
  const expandRight = useCallback(() => setMode('expanded-right'), [])
  const resetLayout = useCallback(() => {
    setMode(window.innerWidth >= SPLIT_THRESHOLD ? 'split' : 'expanded-left')
  }, [])

  return { mode, setMode, splitAllowed, expandLeft, expandRight, resetLayout }
}
