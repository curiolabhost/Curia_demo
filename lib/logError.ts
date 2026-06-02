/**
 * Logs a server-side error with as much structured detail as we can extract,
 * so the dev-server console shows the real cause (Prisma code, message, stack)
 * instead of a generic "server_error". The HTTP response stays generic on
 * purpose — detail goes to the logs, not to the client.
 */
export function logServerError(context: string, error: unknown): void {
  const e = error as {
    name?: string
    code?: string
    message?: string
    meta?: unknown
    clientVersion?: string
    stack?: string
  } | null

  console.error(`[${context}] server error`, {
    name: e?.name,
    code: e?.code, // Prisma errors (e.g. P1001 unreachable DB, P2002 unique) land here
    message: e?.message,
    meta: e?.meta,
    clientVersion: e?.clientVersion,
    stack: e?.stack,
  })
}
