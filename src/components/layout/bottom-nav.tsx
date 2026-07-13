'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Settings,
} from 'lucide-react'

const navItems = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Extrato', href: '/transactions', icon: Receipt },
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
  { label: 'Config.', href: '/settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-12 border-t border-border/80 bg-background/80 backdrop-blur-md pb-safe md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground/80 transition-colors relative cursor-pointer',
              isActive && 'text-foreground dark:text-white'
            )}
          >
            <item.icon className="size-4" />
            <span className={cn("text-[9px] font-medium leading-none", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
