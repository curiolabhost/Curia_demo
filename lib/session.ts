import { SignJWT, jwtVerify } from 'jose'
import type { NextResponse } from 'next/server'

export type SessionData = {
  userId: string
  role: 'STUDENT' | 'ADMIN'
  activeClassroomId?: string
  activeMembershipId?: string
  impersonating?: {
    studentUserId: string
    membershipId: string
    classroomId: string
  }
}

export const SESSION_COOKIE_NAME = 'curia_session'

const ALG = 'HS256'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function encryptSession(data: SessionData): Promise<string> {
  return await new SignJWT({ ...data })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey())
}

export async function decryptSession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: [ALG] })
    const userId = payload.userId
    const role = payload.role
    if (typeof userId !== 'string') return null
    if (role !== 'STUDENT' && role !== 'ADMIN') return null

    const session: SessionData = { userId, role }

    const activeClassroomId = payload.activeClassroomId
    if (typeof activeClassroomId === 'string') {
      session.activeClassroomId = activeClassroomId
    }

    const activeMembershipId = payload.activeMembershipId
    if (typeof activeMembershipId === 'string') {
      session.activeMembershipId = activeMembershipId
    }

    const imp = payload.impersonating
    if (
      imp &&
      typeof imp === 'object' &&
      'studentUserId' in imp &&
      'membershipId' in imp &&
      'classroomId' in imp &&
      typeof (imp as Record<string, unknown>).studentUserId === 'string' &&
      typeof (imp as Record<string, unknown>).membershipId === 'string' &&
      typeof (imp as Record<string, unknown>).classroomId === 'string'
    ) {
      const i = imp as { studentUserId: string; membershipId: string; classroomId: string }
      session.impersonating = {
        studentUserId: i.studentUserId,
        membershipId: i.membershipId,
        classroomId: i.classroomId,
      }
    }
    return session
  } catch {
    return null
  }
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1))
    }
  }
  return null
}

export async function getSession(request: Request): Promise<SessionData | null> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE_NAME)
  if (!token) return null
  return await decryptSession(token)
}

export async function setSessionCookie(
  response: NextResponse,
  data: SessionData
): Promise<NextResponse> {
  const token = await encryptSession(data)
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
  })
  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  })
  return response
}
