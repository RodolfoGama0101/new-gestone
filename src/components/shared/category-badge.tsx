import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  name: string
  color: string
  className?: string
}

export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-border text-foreground h-auto min-h-6 max-w-full gap-2 rounded-md px-2 py-1 text-xs font-medium whitespace-normal',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full border border-current"
        style={{ backgroundColor: color }}
      />
      <span className="min-w-0 [overflow-wrap:anywhere] break-words">
        {name}
      </span>
    </Badge>
  )
}
