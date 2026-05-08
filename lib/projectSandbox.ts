import type { ExpectedEffect } from './lessons'

export type ProjectCheckResult = {
  pass: boolean
  message: string
  effectType: string
}

const DECL_LINE_RE = /^(\s*)(let|const)\s+/

function rewriteToVar(code: string): string {
  return code
    .split('\n')
    .map((line) => line.replace(DECL_LINE_RE, '$1var '))
    .join('\n')
}

type TestScriptParts = { preScript: string; testScript: string }

function buildTestScript(expected: ExpectedEffect): TestScriptParts {
  if (expected.type === 'noError') {
    return {
      preScript: '',
      testScript: `
      try {
        window.parent.postMessage({
          type: '__proj_check__',
          pass: true,
          message: 'Code ran without errors'
        }, '*');
      } catch(e) {
        window.parent.postMessage({
          type: '__proj_check__',
          pass: false,
          message: 'Error: ' + (e && e.message ? e.message : String(e))
        }, '*');
      }
    `,
    }
  }

  if (expected.type === 'domAssignment') {
    const idLit = JSON.stringify(expected.elementId)
    const propLit = JSON.stringify(expected.property)
    const valueTypeCheck = expected.valueType
      ? `if (pass) { pass = typeof after === ${JSON.stringify(expected.valueType)}; }`
      : ''
    const preScript = `
      var __before__ = (function() {
        var el = document.getElementById(${idLit});
        return el ? el[${propLit}] : '__missing__';
      })();
    `
    const testScript = `
      (function() {
        var el = document.getElementById(${idLit});
        if (!el) {
          window.parent.postMessage({
            type: '__proj_check__',
            pass: false,
            message: 'Could not find element with id "' + ${idLit} + '" on the page'
          }, '*');
          return;
        }
        var after = el[${propLit}];
        var pass = after !== __before__
          && after !== null
          && after !== undefined
          && after !== '';
        ${valueTypeCheck}
        window.parent.postMessage({
          type: '__proj_check__',
          pass: pass,
          message: pass
            ? 'Element updated correctly'
            : (after === __before__
              ? 'Your line ran but did not change the element. Make sure you are assigning to the right property.'
              : 'The element was not updated correctly.')
        }, '*');
      })();
    `
    return { preScript, testScript }
  }

  if (expected.type === 'variableValue') {
    const nameLit = JSON.stringify(expected.name)
    const expectedLit = JSON.stringify(expected.expected)
    return {
      preScript: '',
      testScript: `
      (function() {
        var actual;
        if (typeof ${expected.name} !== 'undefined') {
          actual = ${expected.name};
        } else {
          actual = window[${nameLit}];
        }
        var __expected__ = ${expectedLit};
        var pass = actual === __expected__;
        window.parent.postMessage({
          type: '__proj_check__',
          pass: pass,
          message: pass
            ? ${nameLit} + ' has the correct value'
            : ${nameLit} + ' should be ' + String(__expected__) + ' but got ' + String(actual)
        }, '*');
      })();
    `,
    }
  }

  if (expected.type === 'assignment') {
    const valueCheck =
      expected.value !== undefined
        ? `return v === ${JSON.stringify(expected.value)};`
        : expected.valueType
          ? `return typeof v === ${JSON.stringify(expected.valueType)};`
          : 'return true;'
    return {
      preScript: '',
      testScript: `
      (function() {
        var keys = Object.keys(window).filter(function(k) { return !k.startsWith('__'); });
        var match = keys.find(function(k) {
          var v = window[k];
          ${valueCheck}
        });
        window.parent.postMessage({
          type: '__proj_check__',
          pass: !!match,
          message: match
            ? 'Variable assigned correctly'
            : 'No variable found with the expected value'
        }, '*');
      })();
    `,
    }
  }

  // declaration
  const declValueCheck =
    expected.value !== undefined
      ? `return v === ${JSON.stringify(expected.value)};`
      : expected.valueType
        ? `return typeof v === ${JSON.stringify(expected.valueType)};`
        : 'return true;'
  return {
    preScript: '',
    testScript: `
    (function() {
      var keys = Object.keys(window).filter(function(k) { return !k.startsWith('__'); });
      var match = keys.find(function(k) {
        var v = window[k];
        ${declValueCheck}
      });
      window.parent.postMessage({
        type: '__proj_check__',
        pass: !!match,
        message: match
          ? 'Variable declared correctly'
          : 'No variable declared with the expected value'
      }, '*');
    })();
  `,
  }
}

export async function runInProjectSandbox(
  htmlTemplate: string,
  cssTemplate: string,
  studentCode: string,
  expected: ExpectedEffect,
  timeoutMs = 6000,
): Promise<ProjectCheckResult> {
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:absolute;width:0;height:0;border:none;pointer-events:none;opacity:0;'
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
  document.body.appendChild(iframe)

  try {
    const rewrittenStudent = rewriteToVar(studentCode)
    const { preScript, testScript } = buildTestScript(expected)

    const srcdoc = [
      '<!doctype html>',
      '<html>',
      '<head>',
      '<meta charset="UTF-8">',
      '<style>' + cssTemplate + '</style>',
      '</head>',
      '<body>',
      htmlTemplate,
      '<script>',
      '(function() {',
      preScript,
      '  try {',
      rewrittenStudent,
      '  } catch(e) {',
      '    window.parent.postMessage({',
      '      type: "__proj_check__",',
      '      pass: false,',
      '      message: "Your code has an error: " + (e && e.message ? e.message : String(e))',
      '    }, "*");',
      '    return;',
      '  }',
      testScript,
      '})();',
      '</script>',
      '</body>',
      '</html>',
    ].join('\n')

    return await new Promise<ProjectCheckResult>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      let settled = false

      const handler = (event: MessageEvent) => {
        if (settled) return
        const data = event.data as
          | { type?: string; pass?: boolean; message?: string }
          | null
        if (!data || data.type !== '__proj_check__') return
        if ((event.source as Window) !== iframe.contentWindow) return
        settled = true
        window.removeEventListener('message', handler)
        if (timer) clearTimeout(timer)
        resolve({
          pass: !!data.pass,
          message: typeof data.message === 'string' ? data.message : '',
          effectType: expected.type,
        })
      }

      window.addEventListener('message', handler)

      timer = setTimeout(() => {
        if (settled) return
        settled = true
        window.removeEventListener('message', handler)
        resolve({
          pass: false,
          message:
            'Check timed out. Make sure your code does not have an infinite loop.',
          effectType: expected.type,
        })
      }, timeoutMs)

      ;(iframe as HTMLIFrameElement).srcdoc = srcdoc
    })
  } finally {
    if (iframe.parentNode) document.body.removeChild(iframe)
  }
}
