'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'

export function TransactionNavigation() {
  const pathname = usePathname()
  const { month } = useWorkMonth()
  return (
    <nav
      aria-label="Lançamentos por tipo"
      className="border-border flex flex-wrap gap-x-1 border-b min-[601px]:gap-x-3"
    >
      {[
        ['/transactions', 'Todos'],
        ['/income', 'Receitas'],
        ['/expenses', 'Despesas'],
        ['/investments', 'Investimentos'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={workMonthHref(href, month)}
          aria-current={pathname === href ? 'page' : undefined}
          className="text-muted-foreground hover:text-foreground hover:bg-muted aria-[current=page]:border-link aria-[current=page]:text-link -mb-px flex min-h-11 min-w-0 items-center rounded-t-md border-b-2 border-transparent px-2 text-sm [overflow-wrap:anywhere] transition-colors aria-[current=page]:font-medium min-[601px]:px-3"
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
