import { useCallback, useEffect, useState } from 'react'

export type LayoutMode = 'split' | 'expanded-left' | 'expanded-right'

const SPLIT_THRESHOLD = 1024

export function useLayoutMode() {
  const [mode, setMode] = useState<LayoutMode>('split')
  const [splitAllowed, setSplitAllowed] = useState<boolean>(true)

  useEffect(() => {
    const wide = window.innerWidth >= SPLIT_THRESHOLD
    setSplitAllowed(wide)
    if (!wide) setMode('expanded-left')
  }, [])

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
