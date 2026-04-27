import type { ReactNode } from 'react'
import type { ContentBlock, Lesson } from '@/lib/lessons'

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const re = /`([^`]+)`/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <code className="inline-code" key={`c-${key++}`}>
        {match[1]}
      </code>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

const variantStyles: Record<
  'info' | 'warn' | 'danger',
  { border: string; bg: string; label: string }
> = {
  info: {
    border: 'var(--accent)',
    bg: 'var(--accent-dim)',
    label: 'var(--accent)',
  },
  warn: {
    border: 'var(--orange)',
    bg: 'var(--orange-dim)',
    label: 'var(--orange)',
  },
  danger: {
    border: 'var(--red)',
    bg: 'var(--red-dim)',
    label: 'var(--red)',
  },
}

function Block({ block }: { block: ContentBlock }) {
  if (block.kind === 'p') {
    return (
      <p
        style={{
          fontSize: 14,
          color: 'var(--text2)',
          lineHeight: 1.7,
          marginBottom: 12,
          marginTop: 0,
        }}
      >
        {renderInline(block.text)}
      </p>
    )
  }

  if (block.kind === 'concept') {
    return (
      <div
        style={{
          display: 'flex',
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--surface2)',
            padding: '8px 12px',
            minWidth: 180,
          }}
        >
          {block.code}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text2)',
            background: 'var(--bg)',
            padding: '8px 12px',
            flex: 1,
          }}
        >
          {block.desc}
        </div>
      </div>
    )
  }

  if (block.kind === 'code') {
    return (
      <pre
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '14px 16px',
          margin: '12px 0',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          lineHeight: 1.6,
          overflowX: 'auto',
          color: 'var(--text)',
        }}
      >
        {block.lines.map((line, i) => {
          const isComment = line.trimStart().startsWith('//')
          return (
            <div
              key={i}
              style={{
                color: isComment ? 'var(--text3)' : 'var(--text)',
                whiteSpace: 'pre',
              }}
            >
              {line || ' '}
            </div>
          )
        })}
      </pre>
    )
  }

  if (block.kind === 'callout') {
    const v = variantStyles[block.variant]
    return (
      <div
        style={{
          borderLeft: `3px solid ${v.border}`,
          background: v.bg,
          padding: '10px 14px',
          borderRadius: '0 6px 6px 0',
          margin: '14px 0',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: v.label,
            marginBottom: 4,
          }}
        >
          {block.label}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          {block.text}
        </div>
      </div>
    )
  }

  if (block.kind === 'table') {
    return (
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 6,
          margin: '12px 0',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              {block.headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    background: 'var(--surface2)',
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text3)',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      background: ri % 2 === 0 ? 'transparent' : 'var(--surface2)',
                      padding: '8px 12px',
                      fontSize: 13,
                      color: 'var(--text2)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

export function LessonContent({ lesson }: { lesson: Lesson }) {
  return (
    <div>
      <h1
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text)',
          margin: '0 0 14px 0',
          lineHeight: 1.4,
        }}
      >
        {lesson.content.heading}
      </h1>
      {lesson.content.body.map((block, i) => (
        <Block key={i} block={block} />
      ))}
      {lesson.customize && lesson.customize.length > 0 ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--green)',
              marginBottom: 10,
            }}
          >
            Make it yours
          </div>
          {lesson.customize.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 8,
                fontSize: 13,
                color: 'var(--text2)',
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              <span style={{ color: 'var(--green)', flexShrink: 0 }}>→</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
