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
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl sm:tracking-normal">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {action}
        </div>
      )}
    </div>
  )
}
