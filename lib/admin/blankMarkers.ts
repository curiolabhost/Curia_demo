export type LineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'blank'; blankId: string }

const BLANK_RE = /<<([a-z0-9_]+)>>/g

export function extractBlankIds(text: string): string[] {
  const ids: string[] = []
  const re = new RegExp(BLANK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    ids.push(match[1])
  }
  return ids
}

export function insertMarker(
  text: string,
  charPosition: number,
  blankId: string,
): string {
  const pos = Math.max(0, Math.min(charPosition, text.length))
  return `${text.slice(0, pos)}<<${blankId}>>${text.slice(pos)}`
}

export function removeMarker(text: string, blankId: string): string {
  return text.replace(new RegExp(`<<${blankId}>>`, 'g'), '')
}

export function replaceMarker(
  text: string,
  oldId: string,
  newId: string,
): string {
  return text.replace(new RegExp(`<<${oldId}>>`, 'g'), `<<${newId}>>`)
}

export function parseSegments(text: string): LineSegment[] {
  const segments: LineSegment[] = []
  let cursor = 0
  const re = new RegExp(BLANK_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: text.slice(cursor, match.index) })
    }
    segments.push({ kind: 'blank', blankId: match[1] })
    cursor = match.index + match[0].length
  }
  if (cursor < text.length) {
    segments.push({ kind: 'text', value: text.slice(cursor) })
  }
  return segments
}

export function serializeSegments(segments: LineSegment[]): string {
  let out = ''
  for (const seg of segments) {
    if (seg.kind === 'text') out += seg.value
    else out += `<<${seg.blankId}>>`
  }
  return out
}

export function normalizeSegments(segments: LineSegment[]): LineSegment[] {
  const merged: LineSegment[] = []
  for (const s of segments) {
    const last = merged[merged.length - 1]
    if (s.kind === 'text' && last && last.kind === 'text') {
      merged[merged.length - 1] = { kind: 'text', value: last.value + s.value }
    } else {
      merged.push(s)
    }
  }
  const out: LineSegment[] = []
  if (merged.length === 0 || merged[0].kind === 'blank') {
    out.push({ kind: 'text', value: '' })
  }
  for (let i = 0; i < merged.length; i += 1) {
    const cur = merged[i]
    out.push(cur)
    const next = merged[i + 1]
    if (cur.kind === 'blank' && (!next || next.kind === 'blank')) {
      out.push({ kind: 'text', value: '' })
    }
  }
  return out
}
