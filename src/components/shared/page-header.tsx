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
export function PageHeader({
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 self-start [&_button]:h-auto [&_button]:min-h-11 [&_button]:max-w-full [&_button]:py-2 [&_button]:whitespace-normal [&>div]:flex-wrap">
          {action}
        </div>
      )}
    </div>
  )
}
