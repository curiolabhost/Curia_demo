import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { setSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

type RegisterBody = {
  firstName: string
  lastName: string
  username: string
  password: string
  role: 'STUDENT' | 'ADMIN'
}

function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status })
}

function parseBody(body: unknown): RegisterBody | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (
    typeof b.firstName !== 'string' ||
    typeof b.lastName !== 'string' ||
    typeof b.username !== 'string' ||
    typeof b.password !== 'string' ||
    typeof b.role !== 'string'
  ) {
    return null
  }
  if (b.role !== 'STUDENT' && b.role !== 'ADMIN') return null
  return {
    firstName: b.firstName,
    lastName: b.lastName,
    username: b.username,
    password: b.password,
    role: b.role,
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return jsonError(400, 'missing_fields')
  }

  const parsed = parseBody(raw)
  if (!parsed) {
    if (
      typeof raw === 'object' &&
      raw !== null &&
      !Array.isArray(raw) &&
      typeof (raw as Record<string, unknown>).role === 'string' &&
      (raw as Record<string, unknown>).role !== 'STUDENT' &&
      (raw as Record<string, unknown>).role !== 'ADMIN'
    ) {
      return jsonError(400, 'invalid_role')
    }
    return jsonError(400, 'missing_fields')
  }

  const firstName = parsed.firstName.trim()
  const lastName = parsed.lastName.trim()
  const username = parsed.username.trim()
  const password = parsed.password
  const role = parsed.role

  if (!firstName || !lastName || !username || !password) {
    return jsonError(400, 'missing_fields')
  }
  if (!USERNAME_RE.test(username)) {
    return jsonError(400, 'invalid_username')
  }
  if (password.length < 8) {
    return jsonError(400, 'invalid_password')
  }

  try {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return jsonError(409, 'username_taken')
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: { firstName, lastName, username, passwordHash, role },
      select: { id: true, firstName: true, role: true },
    })

    const response = NextResponse.json(
      { ok: true, userId: user.id, role: user.role, firstName: user.firstName },
      { status: 201 }
    )
    return await setSessionCookie(response, { userId: user.id, role: user.role })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return jsonError(409, 'username_taken')
    }
    return jsonError(500, 'server_error')
  }
}
