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
} from 'lucide-react'

const navItems = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Extrato', href: '/transactions', icon: Receipt },
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Investimentos', href: '/investments', icon: Coins },
  { label: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
  { label: 'Categorias', href: '/categories', icon: Tag },
]

const secondaryNavItems = [
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-52 flex-col md:flex border-r border-sidebar-border bg-sidebar">
      {/* Brand Header */}
      <div className="flex h-12 items-center px-4 border-b border-sidebar-border shrink-0">
        <Logo variant="full" size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors duration-100 relative cursor-pointer',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'size-4 shrink-0 transition-transform duration-100',
                  isActive
                    ? 'text-sidebar-foreground'
                    : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground group-hover:scale-105'
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        {/* Separator */}
        <div className="my-2 border-t border-sidebar-border/60" />

        {secondaryNavItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-2.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-colors duration-100 relative cursor-pointer',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'size-4 shrink-0 transition-transform duration-100',
                  isActive
                    ? 'text-sidebar-foreground'
                    : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground group-hover:scale-105'
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-4 h-12 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-sidebar-foreground/45 uppercase tracking-wider select-none">
          v1.0
        </span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
