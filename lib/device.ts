export type DeviceType = 'desktop' | 'tablet'

export function detectDevice(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const hasTouch = navigator.maxTouchPoints > 1
  const isMac = /Macintosh|MacIntel/.test(navigator.userAgent)
  const isWindows = /Windows/.test(navigator.userAgent)

  // Mac with touch is actually an iPad masquerading as Mac (iPadOS 13+ default).
  // Mac without touch is a real MacBook/iMac.
  if (isMac) return hasTouch ? 'tablet' : 'desktop'
  // Windows desktops with touch monitors should still be treated as desktop.
  if (isWindows) return 'desktop'

  return hasTouch ? 'tablet' : 'desktop'
}
