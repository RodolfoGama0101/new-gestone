'use client'

import * as React from 'react'
import Image from 'next/image'
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
    imageSize: 24,
    textSize: 'text-base',
    gap: 'gap-1.5',
  },
  md: {
    imageSize: 32,
    textSize: 'text-xl',
    gap: 'gap-2',
  },
  lg: {
    imageSize: 48,
    textSize: 'text-3xl',
    gap: 'gap-3',
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
    <div className={cn('flex items-center font-bold tracking-tight', config.gap, className)}>
      <div
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl bg-card border border-border shadow-xs transition-transform duration-200 hover:scale-105',
          {
            'size-7 rounded-lg': size === 'sm',
            'size-10 rounded-xl': size === 'md',
            'size-14 rounded-2xl': size === 'lg',
          }
        )}
      >
        <Image
          src="/logo.png"
          alt="GestOne Logo"
          width={config.imageSize * 2} // multi-density display support
          height={config.imageSize * 2}
          className="object-cover size-full"
          priority
        />
      </div>
      {variant === 'full' && (
        <span
          className={cn(
            'transition-all duration-300 hover:opacity-90',
            textColor || 'bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent',
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
