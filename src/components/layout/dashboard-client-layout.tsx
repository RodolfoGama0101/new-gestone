'use client'

import * as React from 'react'
import { SeriesGeneration } from '@/components/transactions/series-generation'
import { SkipLink } from '@/components/shared/skip-link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { McpFocusSync } from '@/components/integrations/mcp-focus-sync'
import { WorkMonthProvider } from '@/providers/work-month-provider'

export function DashboardClientLayout({
  children,
  mcpEnabled = false,
}: {
  children: React.ReactNode
  mcpEnabled?: boolean
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, router, user])

  if (isLoading) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <span role="status" aria-label="Carregando sua conta">
          <Loader2
            aria-hidden="true"
            className="text-primary size-8 animate-spin"
          />
        </span>
      </div>
    )
  }

  if (!user) return null

  return (
    <WorkMonthProvider key={user.uid} uid={user.uid}>
      <div className="bg-background text-foreground min-h-dvh">
        <SkipLink />
        {mcpEnabled && <McpFocusSync />}
        <Sidebar />
        <div className="flex min-h-dvh flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] min-[961px]:pb-0 min-[961px]:pl-(--sidebar-width)">
          <Header />
          <SeriesGeneration />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 scroll-mt-28 px-4 py-6 min-[601px]:scroll-mt-16 min-[601px]:px-6 min-[961px]:px-8 min-[961px]:py-8"
          >
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </WorkMonthProvider>
  )
}
