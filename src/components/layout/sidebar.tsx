'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Logo } from '@/components/shared/logo'
import { navigationGroups } from './navigation'

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="border-border bg-card fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Logo variant="full" size="sm" />
      </div>
      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-6 overflow-y-auto px-3 py-6"
      >
        {navigationGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="text-muted-foreground px-3 pb-2 text-xs font-medium">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  pathname === item.href
                    ? 'bg-accent text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="flex min-h-16 shrink-0 items-center justify-between border-t px-6">
        <span className="text-muted-foreground text-xs">Aparência</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
