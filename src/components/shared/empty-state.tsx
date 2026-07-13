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
    <div className={cn(
      "flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background-100 dark:bg-card/30 text-center animate-in fade-in zoom-in-98 duration-150",
      compact ? "min-h-[140px] p-5" : "min-h-[280px] p-8"
    )}>
      <div className={cn(
        "flex items-center justify-center rounded-md bg-background-200 dark:bg-muted text-muted-foreground border border-border",
        compact ? "size-9 mb-2.5" : "size-11 mb-3.5"
      )}>
        <Icon className={compact ? "size-4.5" : "size-5"} />
      </div>
      <h3 className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>{title}</h3>
      <p className={cn("text-muted-foreground text-xs leading-relaxed mt-1", compact ? "max-w-[200px]" : "max-w-xs")}>{description}</p>
      {action && <div className={compact ? "mt-3" : "mt-4.5"}>{action}</div>}
    </div>
  )
}
