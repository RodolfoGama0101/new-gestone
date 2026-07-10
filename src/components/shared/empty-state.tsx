import * as React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  icon: LucideIcon
  action?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/5 p-10 text-center animate-in fade-in zoom-in-98 duration-300 shadow-xs">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/5 text-primary mb-4.5 border border-primary/10">
        <Icon className="size-7 text-primary/80" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
