import type { Check } from './lessons'
import { runInSandbox, type CheckResult } from './sandbox'

export function runChecksSilently(
  code: string,
  checks: Check[],
  timeoutMs: number = 5000,
): Promise<CheckResult[]> {
  return new Promise((resolve, reject) => {
    const results: CheckResult[] = []
    let settled = false
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    let cleanup: (() => void) | null = null

    const finish = (fn: () => void) => {
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
      fn()
    }

    cleanup = runInSandbox(
      code,
      checks,
      () => {},
      (result) => {
        results.push(result)
      },
      () => {
        finish(() => resolve(results))
      },
    )

    timeoutHandle = setTimeout(() => {
      finish(() => reject(new Error('Execution timed out')))
    }, timeoutMs)
  })
}
