'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { MonthPicker } from '@/components/shared/month-picker'
import { Button } from '@/components/ui/button'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'
import { navigationGroups } from './navigation'

export function Header() {
  const pathname = usePathname()
  const { user, signOutUser } = useAuth()
  const { month, date, setMonth } = useWorkMonth()

  const activeGroup = navigationGroups.find(({ items }) =>
    items.some(({ href }) => href === pathname),
  )
  const pageTitle = activeGroup?.items.find(
    ({ href }) => href === pathname,
  )?.label

  const getInitials = () => {
    if (user?.displayName) {
      const parts = user.displayName.trim().split(/\s+/)
      if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return parts[0].substring(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  const displayName =
    user?.displayName || user?.email?.split('@')[0] || 'Usuário'

  return (
    <header className="border-border bg-background sticky top-0 z-10 shrink-0 border-b">
      <div className="mx-auto grid min-h-16 w-full max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-4 min-[601px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[601px]:px-6 min-[961px]:px-8">
        <div className="min-w-0">
          <div className="min-[961px]:hidden">
            <Logo
              size="sm"
              href={workMonthHref('/', month)}
              className="[&>span]:hidden min-[240px]:[&>span]:inline"
            />
          </div>
          {activeGroup && (
            <p className="text-muted-foreground hidden truncate text-sm min-[961px]:block">
              {activeGroup.label}
              <span aria-hidden="true" className="mx-2">
                /
              </span>
              <span className="text-foreground font-medium">{pageTitle}</span>
            </p>
          )}
        </div>

        <div
          role="group"
          aria-label="Mês de trabalho"
          className="border-border bg-muted col-span-2 col-start-1 row-start-2 mb-2 flex min-w-0 items-center justify-center gap-0.5 rounded-lg border px-0.5 min-[601px]:col-span-1 min-[601px]:col-start-2 min-[601px]:row-start-1 min-[601px]:mb-0"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mês anterior"
            className="size-11"
            disabled={month === '0001-01'}
            onClick={() => setMonth(format(addMonths(date, -1), 'yyyy-MM'))}
          >
            <ChevronLeft />
          </Button>
          <div className="w-44 min-w-0 flex-1">
            <MonthPicker
              value={month}
              onChange={setMonth}
              className="hover:bg-accent justify-center border-0 bg-transparent px-1.5 font-medium"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo mês"
            className="size-11"
            disabled={month === '9999-12'}
            onClick={() => setMonth(format(addMonths(date, 1), 'yyyy-MM'))}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="col-start-2 row-start-1 flex min-h-14 min-w-0 items-center justify-end gap-1 min-[601px]:col-start-3">
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Abrir menu da conta"
                className="hover:bg-accent focus-visible:ring-ring group flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-1.5 py-1 transition-colors outline-none focus-visible:ring-2"
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground hidden max-w-24 truncate text-sm font-medium min-[1200px]:block">
                  {displayName}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="text-muted-foreground hidden size-3 transition-transform duration-150 group-data-popup-open:rotate-180 min-[1200px]:block"
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 rounded-md">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-xs leading-none font-semibold">
                          {displayName}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs leading-none">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOutUser}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer gap-2 rounded-md text-xs"
                >
                  <LogOut className="size-3.5" />
                  <span>Sair da conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
