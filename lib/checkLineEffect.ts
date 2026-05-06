import { runInSandbox, type LogEntry } from './sandbox'

export type ExpectedEffect =
  | { type: 'declaration'; valueType?: string; value?: unknown }
  | { type: 'assignment'; valueType?: string; value?: unknown }
  | { type: 'noError' }

type EffectResult = {
  ok: boolean
  error?: string
  newVars?: Array<{ name: string; value: unknown; valueType: string }>
  changedVars?: Array<{ name: string; from: unknown; to: unknown; valueType: string }>
}

const DECL_RE = /^(\s*)(let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/

function rewriteDeclarations(code: string): string {
  const lines = code.split('\n')
  const out: string[] = []
  for (const line of lines) {
    const m = DECL_RE.exec(line)
    if (m) {
      const indent = m[1]
      const name = m[3]
      const rewritten = line.replace(
        /^(\s*)(let|const|var)\s+/,
        `${indent}var `,
      )
      out.push(
        rewritten +
          ` try { window[${JSON.stringify(name)}] = ${name}; } catch(__e) {}`,
      )
    } else {
      out.push(line)
    }
  }
  return out.join('\n')
}

function applyEffect(
  result: EffectResult,
  expected: ExpectedEffect,
): { pass: boolean; message: string } {
  if (!result.ok) {
    return {
      pass: false,
      message: 'Your code has an error: ' + (result.error ?? 'unknown error'),
    }
  }

  if (expected.type === 'noError') {
    return { pass: true, message: 'Code ran successfully' }
  }

  if (expected.type === 'declaration') {
    const vars = result.newVars ?? []
    const match = vars.find((v) => {
      if (expected.valueType && v.valueType !== expected.valueType) return false
      if (expected.value !== undefined) {
        if (v.value !== expected.value) return false
      }
      return true
    })
    if (match) {
      return { pass: true, message: 'Variable declared successfully' }
    }
    return {
      pass: false,
      message: expected.valueType
        ? 'Make sure you declare a variable of type ' +
          expected.valueType +
          (expected.value !== undefined
            ? ' with value ' + String(expected.value)
            : '')
        : 'No new variable was declared',
    }
  }

  if (expected.type === 'assignment') {
    const vars = result.changedVars ?? []
    const match = vars.find((v) => {
      if (expected.valueType && v.valueType !== expected.valueType) return false
      if (expected.value !== undefined) {
        if (v.to !== expected.value) return false
      }
      return true
    })
    if (match) {
      return { pass: true, message: 'Assignment successful' }
    }
    return {
      pass: false,
      message:
        expected.value !== undefined
          ? 'Make sure you assign the value ' + String(expected.value)
          : 'No variable was changed',
    }
  }

  return { pass: false, message: 'Unknown effect type' }
}

export async function checkLineEffect(
  contextCode: string,
  studentLine: string,
  expected: ExpectedEffect,
  timeoutMs = 5000,
): Promise<{ pass: boolean; message: string }> {
  const rewrittenContext = rewriteDeclarations(contextCode)
  const rewrittenStudent = rewriteDeclarations(studentLine)

  const wrappedCode = `
(function() {
  const __before__ = {};
  try {
    Object.keys(window).forEach(function(k) {
      if (!k.startsWith('__')) {
        try { __before__[k] = window[k]; } catch(e) {}
      }
    });
  } catch(e) {}

  try {
    ${rewrittenStudent}
  } catch(e) {
    console.log(JSON.stringify({
      ok: false,
      error: e.message
    }));
    return;
  }

  const __after__ = {};
  try {
    Object.keys(window).forEach(function(k) {
      if (!k.startsWith('__')) {
        try { __after__[k] = window[k]; } catch(e) {}
      }
    });
  } catch(e) {}

  const __newVars__ = [];
  const __changedVars__ = [];

  Object.keys(__after__).forEach(function(k) {
    if (!(k in __before__)) {
      __newVars__.push({
        name: k,
        value: __after__[k],
        valueType: typeof __after__[k]
      });
    } else if (__after__[k] !== __before__[k]) {
      __changedVars__.push({
        name: k,
        from: __before__[k],
        to: __after__[k],
        valueType: typeof __after__[k]
      });
    }
  });

  console.log(JSON.stringify({
    ok: true,
    newVars: __newVars__,
    changedVars: __changedVars__
  }));
})();
`

  const fullCode = rewrittenContext + '\n' + wrappedCode

  return new Promise((resolve) => {
    const logs: LogEntry[] = []
    let settled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    let cleanup: (() => void) | null = null

    const finish = (out: { pass: boolean; message: string }) => {
      if (settled) return
      settled = true
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        timeoutHandle = null
      }
      if (cleanup) {
        cleanup()
        cleanup = null
      }
      resolve(out)
    }

    cleanup = runInSandbox(
      fullCode,
      [],
      (entry) => {
        logs.push(entry)
      },
      () => {},
      () => {
        let parsed: EffectResult | null = null
        for (const entry of logs) {
          for (const arg of entry.args) {
            if (typeof arg === 'string' && arg.trim().startsWith('{')) {
              try {
                const obj = JSON.parse(arg) as EffectResult
                if (typeof obj.ok === 'boolean') {
                  parsed = obj
                  break
                }
              } catch {
                // not our payload
              }
            }
          }
          if (parsed) break
        }
        if (!parsed) {
          finish({
            pass: false,
            message: 'Could not analyze the result of your code',
          })
          return
        }
        finish(applyEffect(parsed, expected))
      },
    )

    timeoutHandle = setTimeout(() => {
      finish({ pass: false, message: 'Code took too long to run' })
    }, timeoutMs)
  })
}
