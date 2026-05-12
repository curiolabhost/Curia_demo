type SynToken = { kind: string; value: string }

const SYN_KEYWORDS = new Set([
  'let', 'const', 'var', 'if', 'else', 'return', 'function',
  'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'new', 'typeof', 'in', 'of', 'true', 'false', 'null', 'undefined',
])

function tokenizeLine(src: string): SynToken[] {
  const out: SynToken[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      out.push({ kind: 'comment', value: src.slice(i) })
      break
    }
    if (c === "'" || c === '"' || c === '`') {
      const quote = c
      let j = i + 1
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\') j += 2
        else j += 1
      }
      out.push({ kind: 'string', value: src.slice(i, j + 1) })
      i = Math.min(j + 1, src.length)
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1
      out.push({ kind: 'number', value: src.slice(i, j) })
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i
      while (j < src.length && /[A-Za-z0-9_$]/.test(src[j])) j += 1
      const word = src.slice(i, j)
      if (SYN_KEYWORDS.has(word)) {
        out.push({ kind: 'keyword', value: word })
      } else if (src[j] === '(') {
        out.push({ kind: 'fn', value: word })
      } else {
        out.push({ kind: 'ident', value: word })
      }
      i = j
      continue
    }
    out.push({ kind: 'punct', value: c })
    i += 1
  }
  return out
}

function synColor(kind: string): string | undefined {
  if (kind === 'keyword') return '#3B6FE8'
  if (kind === 'string') return '#059669'
  if (kind === 'number') return '#D97706'
  if (kind === 'comment') return '#8B91A8'
  if (kind === 'fn') return '#7C3AED'
  return undefined
}

export function SyntaxLine({ line }: { line: string }) {
  if (!line) return <span>{' '}</span>
  const tokens = tokenizeLine(line)
  return (
    <>
      {tokens.map((tok, i) => (
        <span
          key={i}
          style={{
            color: synColor(tok.kind) ?? 'var(--text)',
            fontStyle: tok.kind === 'comment' ? 'italic' : undefined,
          }}
        >
          {tok.value}
        </span>
      ))}
    </>
  )
}
