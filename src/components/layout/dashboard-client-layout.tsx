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

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode
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
    <div className="bg-background text-foreground min-h-screen transition-colors duration-200">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-screen flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[200px]">
        <Header />
        <SeriesGeneration />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1200px] min-w-0 flex-1 p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
        <footer className="border-border text-muted-foreground hidden h-16 shrink-0 items-center justify-between gap-4 border-t px-8 text-xs md:flex">
          <span>GestOne</span>
          <span>Valores em reais · BRL</span>
        </footer>
      </div>
      <BottomNav />
    </div>
  )
}
