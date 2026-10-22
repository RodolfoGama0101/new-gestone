'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { usePreferences } from '@/providers/preferences-provider'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { changeTheme, theme, isLoading, isSaving, error } = usePreferences()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8" aria-label="Alternar tema">
        <Sun className="size-4 animate-pulse opacity-50" />
      </Button>
    )
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="size-4" />
      case 'dark':
        return <Moon className="size-4" />
      default:
        return <Monitor className="size-4" />
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
        aria-label="Alternar tema"
      >
        {getThemeIcon()}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[110px] rounded-md">
        <DropdownMenuItem disabled={isLoading || isSaving || !!error} onClick={() => { void changeTheme('light').catch(() => undefined) }} className="gap-2 cursor-pointer text-xs rounded-md">
          <Sun className="size-3.5" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLoading || isSaving || !!error} onClick={() => { void changeTheme('dark').catch(() => undefined) }} className="gap-2 cursor-pointer text-xs rounded-md">
          <Moon className="size-3.5" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLoading || isSaving || !!error} onClick={() => { void changeTheme('system').catch(() => undefined) }} className="gap-2 cursor-pointer text-xs rounded-md">
          <Monitor className="size-3.5" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
