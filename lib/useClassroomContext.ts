// 'use client' — this module must only be used in client components.
import { useEffect, useState } from 'react'

type Role = 'STUDENT' | 'ADMIN'

type MeResponse = {
  ok: true
  userId: string
  username: string
  firstName: string
  lastName: string
  role: Role
  activeClassroomId?: string
  activeMembershipId?: string
  impersonating?: {
    studentUserId: string
    membershipId: string
    classroomId: string
    studentFirstName: string
    studentLastName: string
  }
}

type ContextValue = {
  classroomId: string | null
  membershipId: string | null
  role: Role | null
  firstName: string
  lastName: string
  userId: string | null
  isReady: boolean
  isImpersonating: boolean
}

const CACHE_TTL_MS = 60 * 1000

let cached: { value: ContextValue; at: number } | null = null
let inflight: Promise<ContextValue> | null = null

function emptyValue(): ContextValue {
  return {
    classroomId: null,
    membershipId: null,
    role: null,
    firstName: '',
    lastName: '',
    userId: null,
    isReady: false,
    isImpersonating: false,
  }
}

function fromMe(me: MeResponse): ContextValue {
  const isImpersonating = !!me.impersonating
  let classroomId: string | null = null
  let membershipId: string | null = null
  if (isImpersonating && me.impersonating) {
    classroomId = me.impersonating.classroomId
    membershipId = me.impersonating.membershipId
  } else {
    classroomId = me.activeClassroomId ?? null
    membershipId = me.activeMembershipId ?? null
  }
  return {
    classroomId,
    membershipId,
    role: me.role,
    firstName: me.firstName ?? '',
    lastName: me.lastName ?? '',
    userId: me.userId ?? null,
    isReady: true,
    isImpersonating,
  }
}

async function fetchContext(): Promise<ContextValue> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
    })
    if (!res.ok) {
      return { ...emptyValue(), isReady: true }
    }
    const data = (await res.json()) as MeResponse
    return fromMe(data)
  } catch {
    return { ...emptyValue(), isReady: true }
  }
}

function getContext(): Promise<ContextValue> {
  const now = Date.now()
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached.value)
  }
  if (inflight) return inflight
  inflight = fetchContext().then((value) => {
    cached = { value, at: Date.now() }
    inflight = null
    return value
  })
  return inflight
}

export function useClassroomContext(): ContextValue {
  const [value, setValue] = useState<ContextValue>(() => {
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value
    return emptyValue()
  })

  useEffect(() => {
    let cancelled = false
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      if (!cancelled) setValue(cached.value)
      return
    }
    getContext().then((v) => {
      if (!cancelled) setValue(v)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return value
}
