'use client'

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
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Logo variant="full" size="md" />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 text-sm font-medium rounded-xl transition-all cursor-pointer relative overflow-hidden group',
                'hover:bg-accent hover:text-accent-foreground',
                isActive 
                  ? 'bg-primary/8 text-primary font-semibold after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-6 after:w-1.5 after:rounded-r-full after:bg-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('size-5 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer controls */}
      <div className="p-5 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-semibold">Tema do Sistema</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
