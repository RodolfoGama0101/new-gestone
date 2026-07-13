import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  name: string
  color: string
  className?: string
}

// Helper to determine if a hex color is light or dark for readability
function isLightColor(hexColor: string): boolean {
  // Remove hash if present
  const hex = hexColor.replace('#', '')
  if (hex.length !== 6) return false
  
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.6
}

export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  const textColorClass = React.useMemo(() => {
    // Treat preset / named colors or fallbacks safely
    if (!color.startsWith('#')) return 'text-white'
    return isLightColor(color) ? 'text-neutral-900 font-bold' : 'text-white'
  }, [color])

  return (
    <Badge
      className={cn(
        "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border-none",
        textColorClass,
        className
      )}
      style={{ backgroundColor: color }}
    >
      {name}
    </Badge>
  )
}

