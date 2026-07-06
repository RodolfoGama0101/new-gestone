'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { signOutUser } from '@/lib/firebase/auth'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, PiggyBank } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const { user } = useAuth()

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Dashboard'
      case '/income':
        return 'Receitas'
      case '/expenses':
        return 'Despesas'
      case '/analytics':
        return 'Analytics'
      case '/categories':
        return 'Categorias'
      case '/settings':
        return 'Configurações'
      default:
        return 'GestOne'
    }
  }

  const getInitials = (email: string | null) => {
    if (!email) return 'U'
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6">
      {/* Page Title for Desktop & Brand logo for Mobile */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 md:hidden">
          <PiggyBank className="size-5 text-primary" />
          <span className="font-bold text-base bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent mr-2">
            GestOne
          </span>
          <span className="text-muted-foreground text-xs mr-1">•</span>
        </div>
        <h2 className="text-sm font-bold md:text-base tracking-tight">{getPageTitle()}</h2>
      </div>

      {/* Right Section containing controls and user menu */}
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {getInitials(user.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Usuário</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 cursor-pointer">
                <LogOut className="size-4" />
                <span>Sair da conta</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
