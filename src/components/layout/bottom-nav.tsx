'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Settings
} from 'lucide-react'

const mobileNavItems = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Gráficos', href: '/analytics', icon: BarChart3 },
  { label: 'Ajustes', href: '/settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/90 backdrop-blur-md px-3 py-2 flex justify-around md:hidden pb-safe shadow-lg">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all text-[11px] font-semibold flex-1 gap-1.5 cursor-pointer active:scale-95 duration-150',
              isActive 
                ? 'text-primary bg-primary/5 font-bold' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className={cn('size-5.5 transition-transform duration-200', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
