import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-background-100 dark:bg-card/30 flex flex-col items-center justify-center rounded-md border text-center [overflow-wrap:anywhere]',
        compact
          ? 'min-h-[140px] border-0 bg-transparent p-5'
          : 'min-h-[280px] p-8',
      )}
    >
      <div
        className={cn(
          'bg-background-200 dark:bg-muted text-muted-foreground border-border flex items-center justify-center rounded-md border',
          compact ? 'mb-2.5 size-9' : 'mb-3.5 size-11',
        )}
      >
        <Icon className={compact ? 'size-4.5' : 'size-5'} />
      </div>
      <h3
        className={cn(
          'text-foreground font-semibold',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-muted-foreground mt-1 text-sm leading-relaxed',
          compact ? 'max-w-[200px]' : 'max-w-xs',
        )}
      >
        {description}
      </p>
      {action && <div className={compact ? 'mt-3' : 'mt-4.5'}>{action}</div>}
    </div>
  )
}
