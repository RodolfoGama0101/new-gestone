'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Tag,
  Settings,
  PiggyBank
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Categorias', href: '/categories', icon: Tag },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-border bg-card md:flex flex-col">
      {/* Brand Header */}
      <div className="flex h-14 items-center gap-2 px-6 border-b border-border">
        <PiggyBank className="size-6 text-primary" />
        <span className="font-bold text-lg bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
          GestOne
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer',
                'hover:bg-accent hover:text-accent-foreground',
                isActive 
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('size-4.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Tema do Sistema</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
