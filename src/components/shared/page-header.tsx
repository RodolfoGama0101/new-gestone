import * as React from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  actionClassName?: string
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
  actionClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 min-[961px]:flex-row min-[961px]:items-center min-[961px]:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5 [overflow-wrap:anywhere]">
        <h1 className="text-foreground text-2xl leading-8 font-semibold tracking-[-0.04em] min-[601px]:text-[32px] min-[601px]:leading-10">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground max-w-prose text-sm leading-5">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div
          className={cn(
            'flex max-w-full min-w-0 flex-wrap items-center gap-2 [&_button]:h-auto [&_button]:min-h-10 [&_button]:max-w-full [&_button]:py-2 [&_button]:whitespace-normal [&>div]:flex-wrap',
            actionClassName,
          )}
        >
          {action}
        </div>
      )}
    </header>
  )
}
