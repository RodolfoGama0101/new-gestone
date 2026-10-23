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
import { QuickTransaction } from '@/components/transactions/quick-transaction'
import { navigationItems } from './navigation'
import { LogOut, ChevronDown } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const { user, signOutUser } = useAuth()

  const pageTitle =
    navigationItems.find((item) => item.href === pathname)?.label ?? 'GestOne'

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
    <header className="border-border bg-card/95 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6">
      {/* Left: Logo (mobile) + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Logo visível apenas em mobile */}
        <div className="shrink-0 md:hidden">
          <Logo variant="icon-only" size="sm" />
        </div>

        <div className="hidden items-center gap-2 text-sm select-none md:flex">
          <span className="text-muted-foreground text-xs font-medium">
            GestOne
          </span>
          <span
            aria-hidden="true"
            className="text-muted-foreground/30 text-xs font-light"
          >
            /
          </span>
          <span className="text-foreground text-xs font-medium">
            {pageTitle}
          </span>
        </div>

        <h2 className="text-foreground truncate text-sm font-semibold md:hidden">
          {pageTitle}
        </h2>
      </div>

      <QuickTransaction />
      {/* Conta e aparência */}
      <div className="flex shrink-0 items-center gap-2">
        {/* ThemeToggle visível no header em mobile (sidebar não aparece) */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:bg-accent focus-visible:ring-ring group flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 transition-colors outline-none focus-visible:ring-1">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-muted text-foreground text-xs font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-foreground hidden max-w-[120px] truncate text-xs font-medium sm:block">
                {displayName}
              </span>
              <ChevronDown className="text-muted-foreground hidden size-3 transition-transform duration-100 group-data-[state=open]:rotate-180 sm:block" />
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
    </header>
  )
}
