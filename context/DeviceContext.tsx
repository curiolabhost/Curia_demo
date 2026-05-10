'use client'

import { createContext, useContext, useState } from 'react'
import { detectDevice, type DeviceType } from '@/lib/device'

const DeviceContext = createContext<DeviceType>('desktop')

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [device] = useState<DeviceType>(() => detectDevice())
  return (
    <DeviceContext.Provider value={device}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice(): DeviceType {
  return useContext(DeviceContext)
}
