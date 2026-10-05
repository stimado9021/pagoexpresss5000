import type { Metadata } from 'next'
import RolGate from '@/app/rol-gate'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RolGate rol="vendedor">{children}</RolGate>
}