'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Coins,
  MoreHorizontal,
  ArrowUpCircle,
  ArrowDownCircle,
  BarChart3,
  Tag,
  Settings,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const mainItems = [
  { label: 'Painel', href: '/', icon: LayoutDashboard },
  { label: 'Extrato', href: '/transactions', icon: Receipt },
  { label: 'Cartões', href: '/credit-cards', icon: CreditCard },
  { label: 'Investir', href: '/investments', icon: Coins },
]

const extraItems = [
  { label: 'Receitas', href: '/income', icon: ArrowUpCircle },
  { label: 'Despesas', href: '/expenses', icon: ArrowDownCircle },
  { label: 'Relatórios', href: '/analytics', icon: BarChart3 },
  { label: 'Categorias', href: '/categories', icon: Tag },
  { label: 'Config.', href: '/settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)

  const isExtraActive = extraItems.some((item) => pathname === item.href)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-12 border-t border-border/80 bg-background/80 backdrop-blur-md pb-safe md:hidden items-center justify-around">
      {mainItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground/80 transition-colors relative cursor-pointer h-full',
              isActive && 'text-foreground dark:text-white font-semibold'
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className={cn("text-[9px] font-medium leading-none", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* Botão Mais */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger render={
          <button
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground/80 transition-colors relative cursor-pointer h-full border-none bg-transparent outline-hidden',
              isExtraActive && 'text-foreground dark:text-white'
            )}
          >
            <MoreHorizontal className="size-4 shrink-0" />
            <span className={cn("text-[9px] font-medium leading-none", isExtraActive && "font-semibold")}>
              Mais
            </span>
          </button>
        } />
        <SheetContent side="bottom" className="rounded-t-2xl pb-6 max-h-[40vh] border-t border-border">
          <SheetHeader className="pb-2 border-b border-border/40">
            <SheetTitle className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mais Opções
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-y-6 pt-6 px-4 justify-items-center">
            {extraItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-muted/30 transition-all w-full cursor-pointer',
                    isActive && 'text-foreground dark:text-white bg-muted/30'
                  )}
                >
                  <div className={cn(
                    'size-9 rounded-lg flex items-center justify-center bg-muted/40 border border-border/40',
                    isActive && 'bg-primary/10 border-primary/20 text-primary'
                  )}>
                    <item.icon className="size-5" />
                  </div>
                  <span className="text-[10px] font-medium text-center truncate w-full">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
