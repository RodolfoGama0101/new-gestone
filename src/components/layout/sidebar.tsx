'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Logo } from '@/components/shared/logo'
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Tag,
  Settings,
  Receipt,
  Coins,
  CreditCard,
  Repeat2,
  Target,
} from 'lucide-react'

const navItems = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Extrato', href: '/transactions', icon: Receipt },
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Investimentos', href: '/investments', icon: Coins },
  { label: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { label: 'Séries', href: '/series', icon: Repeat2 },
  { label: 'Orçamentos', href: '/budgets', icon: Target },
  { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
  { label: 'Categorias', href: '/categories', icon: Tag },
]

const secondaryNavItems = [
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-20 hidden w-[200px] flex-col border-r md:flex">
      {/* Brand Header */}
      <div className="border-sidebar-border flex h-16 shrink-0 items-center border-b px-6">
        <Logo variant="full" size="sm" />
      </div>

      <div className="mx-4 my-6 flex items-center gap-2.5 text-[13px]">
        <span className="border-border bg-muted flex size-[30px] shrink-0 items-center justify-center rounded-full border text-xs">
          G
        </span>
        <div>
          Finanças pessoais
          <p className="text-muted-foreground text-xs">Seu espaço financeiro</p>
        </div>
      </div>
      {/* Navigation */}
      <nav
        aria-label="Navegação principal"
        className="flex-1 scrollbar-thin space-y-1 overflow-y-auto px-3 pb-6"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-normal transition-colors duration-100',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'size-4 shrink-0 transition-transform duration-100',
                  isActive
                    ? 'text-sidebar-foreground'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground',
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Separator */}
        <div className="border-sidebar-border/60 my-2 border-t" />

        {secondaryNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group relative flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-100',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'size-4 shrink-0 transition-transform duration-100',
                  isActive
                    ? 'text-sidebar-foreground'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground',
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-sidebar-border flex h-16 shrink-0 items-center justify-between gap-2 border-t px-4">
        <span className="text-muted-foreground text-xs select-none">
          Aparência
        </span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
