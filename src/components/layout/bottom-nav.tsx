'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { navigationGroups, navigationItems } from './navigation'

const primaryPaths = ['/', '/transactions', '/credit-cards']
const primaryItems = navigationItems.filter(({ href }) =>
  primaryPaths.includes(href),
)
const moreGroups = navigationGroups
  .map((group) => ({
    ...group,
    items: group.items.filter(({ href }) => !primaryPaths.includes(href)),
  }))
  .filter(({ items }) => items.length > 0)

const tabClass =
  'text-muted-foreground hover:text-foreground data-[active=true]:text-link focus-visible:outline-offset-[-2px] flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-xs transition-colors duration-150 data-[active=true]:font-medium [overflow-wrap:anywhere]'
const tabIconClass =
  'flex h-6 w-9 max-w-full items-center justify-center rounded-full group-data-[active=true]:bg-chart-soft'

export function BottomNav() {
  const pathname = usePathname()
  const { month } = useWorkMonth()
  const [isOpen, setIsOpen] = useState(false)
  const moreActive = !primaryPaths.includes(pathname)

  return (
    <nav
      className="border-border bg-background fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)] min-[961px]:hidden"
      aria-label="Navegação principal"
    >
      {primaryItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={workMonthHref(item.href, month)}
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive}
            className={cn('group', tabClass)}
          >
            <span className={tabIconClass}>
              <item.icon aria-hidden="true" className="size-4" />
            </span>
            <span className="max-w-full">{item.label}</span>
          </Link>
        )
      })}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger
          data-active={moreActive}
          className={cn('group', tabClass)}
          aria-label="Mais opções de navegação"
        >
          <span className={tabIconClass}>
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </span>
          <span>Mais</span>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] gap-0 rounded-t-xl"
        >
          <SheetHeader className="border-border shrink-0 border-b px-5 py-5">
            <SheetTitle>Mais opções</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {moreGroups.map(({ label, items }) => (
              <div key={label}>
                <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                  {label}
                </p>
                <ul className="divide-border divide-y">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={workMonthHref(item.href, month)}
                        aria-current={
                          pathname === item.href ? 'page' : undefined
                        }
                        onClick={() => setIsOpen(false)}
                        className="hover:bg-accent aria-[current=page]:text-link flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-150 aria-[current=page]:font-medium"
                      >
                        <item.icon
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
