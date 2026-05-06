'use client'

import { useMemo } from 'react'

type PreviewIframeProps = {
  htmlTemplate: string
  cssTemplate: string
  assembledJs: string
  refreshKey?: number
}

export function PreviewIframe({
  htmlTemplate,
  cssTemplate,
  assembledJs,
  refreshKey = 0,
}: PreviewIframeProps) {
  const srcDoc = useMemo(() => {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${cssTemplate}</style>
</head>
<body>
${htmlTemplate}
<script>
try {
${assembledJs}
} catch (e) {
  document.body.insertAdjacentHTML('beforeend',
    '<pre style="position:fixed;left:8px;bottom:8px;margin:0;padding:8px 10px;background:rgba(220,38,38,0.12);color:#DC2626;font-family:monospace;font-size:11px;border-radius:4px;max-width:calc(100% - 16px);white-space:pre-wrap;">' +
    String(e && e.message ? e.message : e) +
    '</pre>'
  );
}
</script>
</body>
</html>`
  }, [htmlTemplate, cssTemplate, assembledJs, refreshKey])

  return (
    <iframe
      key={refreshKey}
      title="Final project preview"
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '8px',
        background: '#ffffff',
        display: 'block',
      }}
    />
  )
}
