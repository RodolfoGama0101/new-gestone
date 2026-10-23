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

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  React.useEffect(() => {
    if (!isLoading && !user) router.replace('/login')
  }, [isLoading, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <span role="status" aria-label="Carregando sua conta"><Loader2 aria-hidden="true" className="size-8 animate-spin text-primary" /></span>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-screen flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pl-56 md:pb-0">
        <Header />
        <SeriesGeneration />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
