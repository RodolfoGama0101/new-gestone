import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { DashboardClientLayout } from '@/components/layout/dashboard-client-layout'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = (await cookies()).get('session')?.value
  let isValidSession = false

  if (session) {
    try {
      await adminAuth.verifySessionCookie(session, true)
      isValidSession = true
    } catch {
      isValidSession = false
    }
  }

  if (!isValidSession) redirect('/login')

  return <DashboardClientLayout>{children}</DashboardClientLayout>
}
