'use client'

import * as React from 'react'
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
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Sidebar />
      <div className="flex min-h-screen flex-col pb-24 md:pl-52 md:pb-0">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 p-5 sm:p-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}
