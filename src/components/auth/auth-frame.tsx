import type { ReactNode } from 'react'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted relative flex min-h-dvh flex-col items-center justify-center px-6 py-24">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo variant="full" size="lg" href="" />
        </div>
        {children}
      </div>
    </div>
  )
}
