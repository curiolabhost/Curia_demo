'use client'

import { useState } from 'react'

const colors = {
  html: { active: '#185FA5', bg: '#E6F1FB', border: '#185FA5', text: '#0C447C' },
  css:  { active: '#854F0B', bg: '#FAEEDA', border: '#854F0B', text: '#633806' },
  js:   { active: '#534AB7', bg: '#EEEDFE', border: '#534AB7', text: '#3C3489' },
}

function getLabel(html, css, js) {
  if (!html) return 'Turn on HTML to see something.'
  if (html && !css && !js) return 'HTML puts the buttons on the page.'
  if (html && css && !js) return 'CSS makes them look right — but clicking does nothing yet.'
  if (html && css && js)  return 'Tap the squares to light them up.'
  if (html && !css && js) return 'JS is on but there is nothing styled yet. Turn on CSS.'
  return ''
}

export default function LanguageToggle() {
  const [html, setHtml] = useState(true)
  const [css,  setCss]  = useState(false)
  const [js,   setJs]   = useState(false)
  const [lit,  setLit]  = useState(null)

  function toggleJs() {
    if (js) setLit(null)
    setJs(v => !v)
  }

  function handleButtonClick(index) {
    if (!js) return
    setLit(prev => prev === index ? null : index)
  }

  const showContent = html
  const showStyles  = html && css

  const toggleBtnStyle = (lang, active) => ({
    padding: '6px 16px',
    borderRadius: 6,
    border: `1.5px solid ${active ? colors[lang].border : '#D4D2CB'}`,
    background: active ? colors[lang].bg : '#F5F3EE',
    color: active ? colors[lang].text : '#888780',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const previewBtnStyle = (index) => {
    if (!showStyles) return {}
    const isLit = lit === index
    return {
      width: 64,
      height: 64,
      borderRadius: 8,
      background: isLit ? '#FAC775' : '#1A1E2E',
      border: 'none',
      cursor: js ? 'pointer' : 'default',
      transition: 'background 0.15s',
    }
  }

  return (
    <div style={{ margin: '24px 0' }}>
      {/* Toggle buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={toggleBtnStyle('html', html)} onClick={() => setHtml(v => !v)}>
          HTML
        </button>
        <button style={toggleBtnStyle('css', css)} onClick={() => setCss(v => !v)}>
          CSS
        </button>
        <button style={toggleBtnStyle('js', js)} onClick={toggleJs}>
          JS
        </button>
      </div>

      {/* Preview panel */}
      <div style={{
        background: '#fff',
        border: '1px solid #E2E0D8',
        borderRadius: 8,
        padding: '1.5rem',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
        {showContent ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {[0, 1, 2, 3].map(i =>
              showStyles ? (
                <button
                  key={i}
                  style={previewBtnStyle(i)}
                  onClick={() => handleButtonClick(i)}
                />
              ) : (
                <button key={i}>{i + 1}</button>
              )
            )}
          </div>
        ) : null}
        <p style={{ fontSize: 13, color: '#8B91A8', margin: 0, textAlign: 'center' }}>
          {getLabel(html, css, js)}
        </p>
      </div>

      {/* Teaching note */}
      <p style={{ fontSize: 12, color: '#8B91A8', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
        Each language only does its own job. HTML can&apos;t style. CSS can&apos;t react. JS can&apos;t create elements.
      </p>
    </div>
  )
}
