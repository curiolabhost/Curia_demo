import type { Check } from './lessons'

export type LogType = 'log' | 'error' | 'warn' | 'info' | 'result'

export type LogEntry = {
  type: LogType
  args: string[]
}

export type CheckResult = {
  id: number
  label: string
  passed: boolean
  actual?: unknown
  checkType: 'variable' | 'call' | 'console'
}

const SANDBOX_ID = 'codelab-sandbox'

function getOrCreateIframe(): HTMLIFrameElement {
  let iframe = document.getElementById(SANDBOX_ID) as HTMLIFrameElement | null
  if (!iframe) {
    iframe = document.createElement('iframe')
    iframe.id = SANDBOX_ID
    iframe.setAttribute('sandbox', 'allow-scripts allow-modals')
    iframe.style.cssText = 'display:none;position:absolute;'
    document.body.appendChild(iframe)
  }
  return iframe
}

export function defaultCheckLabel(check: Check): string {
  if (check.label) return check.label
  if (check.type === 'variable') {
    if (check.expected === null) {
      return `variable '${check.name}' exists`
    }
    return `variable '${check.name}' equals ${JSON.stringify(check.expected)}`
  }
  if (check.type === 'variableNotEquals') {
    return check.label ?? `variable '${check.name}' was changed from ${JSON.stringify(check.value)}`
  }
  if (check.type === 'call') {
    const argsStr = check.args.map((a) => JSON.stringify(a)).join(', ')
    return `calling ${check.fn}(${argsStr}) satisfies: ${check.assert}`
  }
  if (check.type === 'console') {
    return `console output includes '${check.includes}'`
  }
  if (check.type === 'consoleNonEmpty') {
    return 'something is printed to the console'
  }
  return check.label ?? (check.not
    ? 'code does not contain unexpected pattern'
    : 'code contains expected pattern')
}

function buildCheckRunners(checks: Check[]): string {
  const lines: string[] = []
  checks.forEach((check, index) => {
    if (check.type === 'variable') {
      const nameLit = JSON.stringify(check.name)
      let passedExpr: string
      if (check.expected === null) {
        passedExpr = `typeof window[${nameLit}] !== 'undefined'`
      } else {
        const expectedLit = JSON.stringify(check.expected)
        passedExpr = `__deepEqual(window[${nameLit}], ${expectedLit})`
      }
      lines.push(`
try {
  var __actual_${index} = window[${nameLit}];
  var __passed_${index} = ${passedExpr};
  window.parent.postMessage({
    type: '__check__', id: ${index}, passed: __passed_${index},
    actual: __serialize(__actual_${index})
  }, '*');
} catch(e) {
  window.parent.postMessage({
    type: '__check__', id: ${index}, passed: false,
    actual: 'Error: ' + (e && e.message ? e.message : String(e))
  }, '*');
}`)
    } else if (check.type === 'variableNotEquals') {
      const nameLit = JSON.stringify(check.name)
      const expectedLit = JSON.stringify(check.value)
      const passedExpr = `typeof window[${nameLit}] !== 'undefined' && !__deepEqual(window[${nameLit}], ${expectedLit})`
      lines.push(`
try {
  var __actual_${index} = window[${nameLit}];
  var __passed_${index} = ${passedExpr};
  window.parent.postMessage({
    type: '__check__', id: ${index}, passed: __passed_${index},
    actual: __serialize(__actual_${index})
  }, '*');
} catch(e) {
  window.parent.postMessage({
    type: '__check__', id: ${index}, passed: false,
    actual: 'Error: ' + (e && e.message ? e.message : String(e))
  }, '*');
}`)
    } else if (check.type === 'call') {
      const fnLit = JSON.stringify(check.fn)
      const argsLit = JSON.stringify(check.args)
      const assertLit = JSON.stringify(check.assert)
      lines.push(`
try {
  if (typeof window[${fnLit}] !== 'function') {
    window.parent.postMessage({
      type: '__check__', id: ${index}, passed: false,
      actual: 'Error: function ' + ${fnLit} + ' is not defined'
    }, '*');
  } else {
    var __result_${index} = window[${fnLit}].apply(null, ${argsLit});
    var __passed_${index} = (new Function('result', 'return (' + ${assertLit} + ');'))(__result_${index});
    window.parent.postMessage({
      type: '__check__', id: ${index}, passed: !!__passed_${index},
      actual: __serialize(__result_${index})
    }, '*');
  }
} catch(e) {
  window.parent.postMessage({
    type: '__check__', id: ${index}, passed: false,
    actual: 'Error: ' + (e && e.message ? e.message : String(e))
  }, '*');
}`)
    }
  })
  return lines.join('\n')
}

const VALID_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function buildCaptureCode(checks: Check[]): string {
  const names: string[] = []
  const seen = new Set<string>()
  const add = (n: string) => {
    if (seen.has(n)) return
    seen.add(n)
    names.push(n)
  }
  for (const c of checks) {
    if (c.type === 'variable') add(c.name)
    if (c.type === 'variableNotEquals') add(c.name)
    if (c.type === 'call') add(c.fn)
  }
  const lines: string[] = []
  for (const name of names) {
    if (!VALID_IDENT.test(name)) continue
    const lit = JSON.stringify(name)
    lines.push(
      `try { window[${lit}] = (typeof ${name} !== 'undefined' ? ${name} : undefined); } catch(__e) {}`,
    )
  }
  return lines.join('\n')
}

function buildSrcDoc(code: string, checks: Check[]): string {
  const checkRunners = buildCheckRunners(checks)
  const captureCode = buildCaptureCode(checks)
  return `<!doctype html><html><head></head><body><script>
(function(){
  function __serialize(v){
    try {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'function') return '[Function]';
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    } catch(e) { return String(v); }
  }
  function __deepEqual(a, b){
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return a === b;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!__deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var j = 0; j < ka.length; j++) {
      if (!Object.prototype.hasOwnProperty.call(b, ka[j])) return false;
      if (!__deepEqual(a[ka[j]], b[ka[j]])) return false;
    }
    return true;
  }
  window.__serialize = __serialize;
  window.__deepEqual = __deepEqual;

  var methods = ['log','error','warn','info'];
  methods.forEach(function(method){
    var original = console[method];
    console[method] = function(){
      var args = Array.prototype.slice.call(arguments);
      var serialized = args.map(function(a){
        try {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          if (typeof a === 'object') return JSON.stringify(a, null, 2);
          return String(a);
        } catch(e) { return '[Unserializable]'; }
      });
      window.parent.postMessage({ type: method, args: serialized }, '*');
      try { original.apply(console, args); } catch(e) {}
    };
  });

  try {
    eval(${JSON.stringify(code + '\n;\n' + captureCode)});
  } catch(e) {
    var __msg = (e && e.name && e.message) ? (e.name + ': ' + e.message) : String(e);
    window.parent.postMessage({ type: 'error', args: [__msg] }, '*');
  }

${checkRunners}

  window.parent.postMessage({ type: '__done__' }, '*');
})();
</script></body></html>`
}

export function runInSandbox(
  code: string,
  checks: Check[],
  onLog: (entry: LogEntry) => void,
  onCheckResult: (result: CheckResult) => void,
  onDone: () => void,
): () => void {
  const iframe = getOrCreateIframe()

  const iframeChecks = checks.filter(
    (c) => c.type === 'variable' || c.type === 'call' || c.type === 'variableNotEquals',
  )
  const expectedCheckCount = iframeChecks.length
  let receivedCheckCount = 0
  let doneFired = false
  let iframeDoneFired = false
  const collectedLogs: LogEntry[] = []

  const runConsoleChecks = () => {
    const allOutput = collectedLogs
      .flatMap((e) => e.args)
      .join(' ')
    checks.forEach((check, index) => {
      if (check.type === 'console') {
        const passed = allOutput.includes(check.includes)
        onCheckResult({
          id: index,
          label: defaultCheckLabel(check),
          passed,
          actual: allOutput,
          checkType: 'console',
        })
      } else if (check.type === 'consoleNonEmpty') {
        const passed = allOutput.trim().length > 0
        onCheckResult({
          id: index,
          label: check.label ?? 'something is printed to the console',
          passed,
          actual: allOutput || '(nothing)',
          checkType: 'console',
        })
      }
    })
  }

  const maybeFinish = () => {
    if (doneFired) return
    if (iframeDoneFired && receivedCheckCount >= expectedCheckCount) {
      doneFired = true
      runConsoleChecks()
      onDone()
    }
  }

  const handler = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return
    const data = event.data as {
      type: string
      args?: unknown
      id?: number
      passed?: boolean
      actual?: unknown
    }
    if (!data || typeof data.type !== 'string') return
    if (data.type === '__done__') {
      iframeDoneFired = true
      maybeFinish()
      return
    }
    if (data.type === '__check__') {
      const id = typeof data.id === 'number' ? data.id : -1
      const check = checks[id]
      if (check) {
        const result: CheckResult = {
          id,
          label: defaultCheckLabel(check),
          passed: !!data.passed,
          actual: data.actual,
          checkType: check.type as 'variable' | 'call' | 'console',
        }
        onCheckResult(result)
      }
      receivedCheckCount += 1
      maybeFinish()
      return
    }
    const allowed: LogType[] = ['log', 'error', 'warn', 'info', 'result']
    if (!allowed.includes(data.type as LogType)) return
    const args = Array.isArray(data.args) ? (data.args as unknown[]).map((a) => String(a)) : []
    const entry: LogEntry = { type: data.type as LogType, args }
    collectedLogs.push(entry)
    onLog(entry)
  }

  window.addEventListener('message', handler)

  iframe.srcdoc = buildSrcDoc(code, checks)

  return () => {
    window.removeEventListener('message', handler)
  }
}
