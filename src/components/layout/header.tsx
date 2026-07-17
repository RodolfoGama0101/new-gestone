'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { signOutUser } from '@/lib/firebase/auth'
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
import { LogOut, ChevronDown } from 'lucide-react'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Painel',
  '/transactions': 'Extrato',
  '/income': 'Receitas',
  '/expenses': 'Despesas',
  '/investments': 'Investimentos',
  '/credit-cards': 'Cartões',
  '/analytics': 'Relatórios',
  '/categories': 'Categorias',
  '/settings': 'Configurações',
}

export function Header() {
  const pathname = usePathname()
  const { user } = useAuth()

  const pageTitle = PAGE_TITLES[pathname] ?? 'GestOne'

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

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Usuário'

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
      {/* Left: Logo (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Logo visível apenas em mobile */}
        <div className="md:hidden shrink-0">
          <Logo variant="icon-only" size="sm" />
        </div>

        <div className="hidden md:flex items-center gap-2 text-sm select-none">
          <span className="text-xs font-medium text-muted-foreground/60">GestOne</span>
          <span className="text-xs text-muted-foreground/30 font-light">/</span>
          <span className="text-xs font-medium text-foreground">{pageTitle}</span>
        </div>

        <h2 className="text-sm font-semibold text-foreground md:hidden truncate">
          {pageTitle}
        </h2>
      </div>

      {/* Right: Theme toggle + User menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* ThemeToggle visível no header em mobile (sidebar não aparece) */}
        <div className="md:hidden">
          <ThemeToggle />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer group">
              <Avatar className="size-6 shrink-0">
                <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-xs font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="hidden sm:block size-3 text-muted-foreground transition-transform duration-100 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-md">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-semibold leading-none truncate">{displayName}</p>
                      <p className="text-[10px] leading-none text-muted-foreground truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOutUser}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 cursor-pointer text-xs rounded-md"
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
