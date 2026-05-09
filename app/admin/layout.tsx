import { notFound } from 'next/navigation'
import { assertEditAllowed } from '@/lib/admin/gate'
import './admin.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gate = assertEditAllowed()
  if (!gate.ok) {
    notFound()
  }
  return <>{children}</>
}
