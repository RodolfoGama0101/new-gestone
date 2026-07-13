'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'icon-only' | 'full'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  href?: string
  textColor?: string
}

const sizeMap = {
  sm: {
    iconSize: 'size-5',
    textSize: 'text-sm font-semibold',
    gap: 'gap-1.5',
  },
  md: {
    iconSize: 'size-7',
    textSize: 'text-base font-semibold',
    gap: 'gap-2',
  },
  lg: {
    iconSize: 'size-9',
    textSize: 'text-xl font-bold tracking-tight',
    gap: 'gap-2.5',
  },
}

export function Logo({
  variant = 'full',
  size = 'md',
  className,
  href = '/',
  textColor,
}: LogoProps) {
  const config = sizeMap[size]

  const logoContent = (
    <div className={cn('flex items-center tracking-tight group', config.gap, className)}>
      <div className={cn(
        'relative flex items-center justify-center shrink-0 text-foreground transition-transform duration-150 group-hover:scale-105',
        config.iconSize
      )}>
        {/* SVG stylized modern minimalist "G" */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-full text-foreground dark:text-white"
        >
          <path d="M21 12a9 9 0 1 1-6.21-8.58" />
          <path d="M12 7h9v5" />
        </svg>
      </div>
      {variant === 'full' && (
        <span
          className={cn(
            'text-foreground dark:text-white leading-none',
            textColor,
            config.textSize
          )}
        >
          GestOne
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex cursor-pointer focus:outline-hidden">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
