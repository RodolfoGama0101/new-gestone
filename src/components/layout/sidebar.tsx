'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/shared/logo'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'
import { navigationGroups } from './navigation'

export function Sidebar() {
  const pathname = usePathname()
  const { month } = useWorkMonth()

  return (
    <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-20 hidden w-(--sidebar-width) flex-col border-r min-[961px]:flex">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Logo size="md" href={workMonthHref('/', month)} />
      </div>
      <nav
        aria-label="Navegação principal"
        className="flex-1 scrollbar-thin space-y-5 overflow-y-auto px-3 pt-3 pb-5"
      >
        {navigationGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium">
              {label}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={workMonthHref(item.href, month)}
                    aria-current={pathname === item.href ? 'page' : undefined}
                    className="text-muted-foreground hover:bg-sidebar-accent hover:text-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground before:bg-link relative flex min-h-10 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150 before:absolute before:left-0 before:h-4 before:w-0.5 before:rounded-full before:opacity-0 before:transition-opacity aria-[current=page]:font-medium aria-[current=page]:before:opacity-100"
                  >
                    <item.icon aria-hidden="true" className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="border-sidebar-border text-muted-foreground border-t px-6 py-4 text-xs">
        Valores em reais · BRL
      </p>
    </aside>
  )
}
