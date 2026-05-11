import { NextResponse, type NextRequest } from 'next/server'
import { getSession, type SessionData } from './session'

type AuthResult =
  | { session: SessionData; error: null }
  | { session: null; error: NextResponse }

function unauthenticated(): NextResponse {
  return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
}

function forbidden(): NextResponse {
  return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
}

export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const session = await getSession(req)
  if (!session) return { session: null, error: unauthenticated() }
  return { session, error: null }
}

export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const session = await getSession(req)
  if (!session) return { session: null, error: unauthenticated() }
  if (session.role !== 'ADMIN') return { session: null, error: forbidden() }
  return { session, error: null }
}

export async function requireStudent(req: NextRequest): Promise<AuthResult> {
  const session = await getSession(req)
  if (!session) return { session: null, error: unauthenticated() }
  if (session.role !== 'STUDENT') return { session: null, error: forbidden() }
  return { session, error: null }
}

export function getEffectiveUserId(session: SessionData): string {
  return session.impersonating?.studentUserId ?? session.userId
}

export function getEffectiveMembershipId(session: SessionData): string | null {
  return session.impersonating?.membershipId ?? null
}

export function isImpersonating(session: SessionData): boolean {
  return session.impersonating !== undefined
}
