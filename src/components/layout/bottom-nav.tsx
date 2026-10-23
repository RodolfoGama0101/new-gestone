'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { navigationGroups, mobileNavigationItems } from './navigation'

export function BottomNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const extraActive = !mobileNavigationItems.some(
    (item) => item.href === pathname,
  )
  return (
    <nav
      aria-label="Navegação principal"
      className="bg-card fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-stretch border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {mobileNavigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? 'page' : undefined}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs',
            pathname === item.href
              ? 'text-primary font-semibold'
              : 'text-muted-foreground',
          )}
        >
          <item.icon aria-hidden="true" className="size-5" />
          {item.label}
        </Link>
      ))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs',
            extraActive
              ? 'text-primary font-semibold'
              : 'text-muted-foreground',
          )}
          aria-label="Mais opções de navegação"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          Mais
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-xl pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pr-14">
            <SheetTitle>Mais opções</SheetTitle>
            <SheetDescription>
              Acesse todas as áreas do GestOne.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-4">
            {navigationGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  {group.label}
                </p>
                {group.items
                  .filter(
                    (item) =>
                      !mobileNavigationItems.some(
                        (main) => main.href === item.href,
                      ),
                  )
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === item.href ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm',
                        pathname === item.href
                          ? 'bg-accent text-primary font-semibold'
                          : 'hover:bg-muted',
                      )}
                    >
                      <item.icon
                        className="size-5 shrink-0"
                        aria-hidden="true"
                      />
                      {item.label}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
