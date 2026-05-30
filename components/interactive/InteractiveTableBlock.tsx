'use client'

import { useState } from 'react'

type Row = { meaning: string; example: string; answer: string }

export default function InteractiveTableBlock({
  headers,
  rows,
}: {
  headers: string[]
  rows: Row[]
}) {
  const [values, setValues] = useState<string[]>(() => rows.map(() => ''))

  const correct = rows.map((row, i) => values[i].trim() === row.answer)
  const allCorrect = correct.every(Boolean)

  return (
    <div style={{ margin: '12px 0' }}>
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 6,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
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
            {rows.map((row, i) => (
              <tr key={i}>
                <td
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface2)',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'var(--text2)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {row.meaning}
                </td>
                <td
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface2)',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: 'var(--text2)',
                    borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {row.example}
                </td>
                <td
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'var(--surface2)',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      aria-label={row.meaning}
                      value={values[i]}
                      placeholder="_"
                      onChange={(e) => {
                        const next = [...values]
                        next[i] = e.target.value
                        setValues(next)
                      }}
                      style={{
                        width: 56,
                        fontFamily: 'var(--mono)',
                        fontSize: 13,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: correct[i]
                          ? '1.5px solid var(--green, #3bb87f)'
                          : '1.5px solid var(--border)',
                        background: correct[i] ? 'var(--green-dim, #e8f8f0)' : 'var(--bg)',
                        color: 'var(--text)',
                        outline: 'none',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    />
                    {correct[i] && (
                      <span style={{ color: 'var(--green, #3bb87f)', fontSize: 14 }}>✓</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allCorrect && (
        <div
          style={{
            borderLeft: '3px solid var(--accent)',
            background: 'var(--accent-dim)',
            padding: '10px 14px',
            borderRadius: '0 6px 6px 0',
            marginTop: 10,
            fontSize: 14,
            color: 'var(--text2)',
          }}
        >
          ✓ All operators correct!
        </div>
      )}
    </div>
  )
}
