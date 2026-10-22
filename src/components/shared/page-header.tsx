import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/**
 * PageHeader — componente padronizado para o topo de cada página do dashboard.
 * Garante consistência visual em título, descrição e área de ação (botões, filtros etc.).
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl sm:tracking-normal">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 self-start [&>div]:flex-wrap [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-11 [&_button]:py-2">
          {action}
        </div>
      )}
    </div>
  )
}
