export type GateResult = { ok: true } | { ok: false }

export function assertEditAllowed(): GateResult {
  if (process.env.CURIA_EDIT_MODE === 'true') {
    return { ok: true }
  }
  return { ok: false }
}
