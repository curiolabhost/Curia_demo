import type { ReactNode } from 'react'
import type { ContentBlock, ContentPage, Lesson } from '@/lib/lessons'

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

function DownArrow({ color = '#888780' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '5px 0' }}>
      <svg width="14" height="22" viewBox="0 0 14 22">
        <line x1="7" y1="0" x2="7" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <polyline points="3,13 7,18 11,13" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function DiagramPercentOperator() {
  return (
    <div style={{ background: '#F0F2F8', borderRadius: 16, padding: '2rem 2.5rem 2.5rem', margin: '16px 0' }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', color: '#888780', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
        What % does
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ borderRadius: 99, padding: '5px 18px', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, background: '#E6F1FB', border: '1.5px solid #378ADD', color: '#0C447C' }}>
            number
          </div>
          <DownArrow />
          <div style={{ borderRadius: 10, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 500, background: '#fff', border: '2px solid #378ADD', color: '#0C447C' }}>
            10
          </div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 5 }}>the value</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 500, color: '#D85A30', margin: '12px 0' }}>%</div>
          <div style={{ borderRadius: 99, padding: '5px 18px', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, background: '#F1EFE8', border: '1.5px solid #888780', color: '#444441' }}>
            divisor
          </div>
          <DownArrow />
          <div style={{ borderRadius: 10, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 500, background: '#fff', border: '2px solid #888780', color: '#444441' }}>
            3
          </div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 5 }}>divide by</div>
        </div>

        <div style={{ fontSize: 28, color: '#B4B2A9', fontWeight: 300, lineHeight: 1 }}>→</div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ borderRadius: 99, padding: '5px 18px', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 500, background: '#FAECE7', border: '1.5px solid #D85A30', color: '#712B13' }}>
            remainder
          </div>
          <DownArrow color="#D85A30" />
          <div style={{ borderRadius: 10, width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 500, background: '#FAECE7', border: '2px solid #D85A30', color: '#712B13' }}>
            1
          </div>
          <div style={{ fontSize: 12, color: '#888780', marginTop: 5 }}>what&apos;s left over</div>
        </div>

        <div style={{ minWidth: 200, flex: 1 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, color: '#2C2C2A', marginBottom: 10 }}>
            10 <span style={{ color: '#D85A30' }}>%</span> 3
          </div>
          <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.65 }}>
            10 ÷ 3 = 3 groups, with <strong style={{ color: '#712B13', fontWeight: 500 }}>1 left over</strong>.<br />
            The % operator gives you just that leftover. Not the answer — the remainder.
          </div>
        </div>

      </div>
    </div>
  )
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

  if (block.kind === 'image') {
    return (
      <figure
        className="lesson-image"
        style={{ margin: '24px 0' }}
      >
        <img
          src={block.src}
          alt={block.alt}
          style={{ width: '100%', borderRadius: '6px', display: 'block' }}
        />
        {block.caption ? (
          <figcaption
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              marginTop: 8,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (block.kind === 'video') {
    return (
      <figure
        className="lesson-video"
        style={{ margin: '24px 0' }}
      >
        <video
          src={block.src}
          controls
          autoPlay={false}
          playsInline
          style={{
            width: '100%',
            borderRadius: '6px',
            display: 'block',
            backgroundColor: '#000',
          }}
        />
        {block.caption ? (
          <figcaption
            style={{
              fontSize: 13,
              color: 'var(--text3)',
              marginTop: 8,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            {block.caption}
          </figcaption>
        ) : null}
      </figure>
    )
  }

  if (block.kind === 'diagram') {
    if (block.variant === 'percent-operator') return <DiagramPercentOperator />
    return null
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

export function LessonContent({
  page,
  isLastPage,
  lesson,
}: {
  page: ContentPage
  isLastPage: boolean
  lesson: Lesson
}) {
  return (
    <div>
      {page.heading ? (
        <h1
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text)',
            margin: '0 0 14px 0',
            lineHeight: 1.4,
          }}
        >
          {page.heading}
        </h1>
      ) : null}
      {page.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
      {isLastPage && lesson.customize && lesson.customize.length > 0 ? (
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
