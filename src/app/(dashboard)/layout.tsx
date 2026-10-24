import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { DashboardClientLayout } from '@/components/layout/dashboard-client-layout'
import { mcpConfig } from '@/lib/mcp/config'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = (await cookies()).get('session')?.value
  let isValidSession = false
  let uid = ''

  if (session) {
    try {
      uid = (await adminAuth.verifySessionCookie(session, true)).uid
      isValidSession = true
    } catch {
      isValidSession = false
    }
  }

  if (!isValidSession) redirect('/login')

  let mcpEnabled = false
  try {
    mcpEnabled = mcpConfig().uids.includes(uid)
  } catch {
    /* Integração opcional, fechada por padrão. */
  }
  return (
    <DashboardClientLayout mcpEnabled={mcpEnabled}>
      {children}
    </DashboardClientLayout>
  )
}
