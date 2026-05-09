export function slotHash(key: number | string): number {
  if (typeof key === 'number') return (key * 2654435761) >>> 0
  const s = String(key ?? '')
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}
