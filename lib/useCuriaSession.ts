'use client'
import { useEffect, useState } from 'react'

type CuriaSession = {
  role: 'ADMIN' | 'STUDENT' | null
  loading: boolean
}

export function useCuriaSession(): CuriaSession {
  const [role, setRole] = useState<'ADMIN' | 'STUDENT' | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const raw = data?.role
        setRole(raw === 'ADMIN' || raw === 'STUDENT' ? raw : null)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  return { role, loading }
}
