'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function TransactionNavigation() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Lançamentos por tipo"
      className="border-border flex gap-6 overflow-auto border-b"
    >
      {[
        ['/transactions', 'Todos'],
        ['/income', 'Receitas'],
        ['/expenses', 'Despesas'],
        ['/investments', 'Investimentos'],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          className={`shrink-0 border-b-2 pb-3.5 text-sm ${pathname === href ? 'border-foreground text-foreground font-medium' : 'text-muted-foreground hover:text-foreground border-transparent'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
