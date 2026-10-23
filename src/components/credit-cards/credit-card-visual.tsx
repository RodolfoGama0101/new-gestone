'use client'

import * as React from 'react'
import { CreditCard as CardIcon } from 'lucide-react'

interface CreditCardVisualProps {
  name: string
  bankName: string
  brand: 'visa' | 'mastercard' | 'elo' | 'other'
  holderName: string
  closingDay: number
  color: string // Hex or HSL
  className?: string
  compact?: boolean
}

export function CreditCardVisual({
  name,
  bankName,
  brand,
  holderName,
  closingDay,
  color,
  className,
  compact = false,
}: CreditCardVisualProps) {
  // Renderiza a bandeira do cartão em SVG ou texto
  const renderBrandLogo = () => {
    switch (brand) {
      case 'visa':
        return (
          <span className="text-base leading-none font-medium tracking-wider text-white italic select-none">
            VISA
          </span>
        )
      case 'mastercard':
        return (
          <div className="flex items-center -space-x-1 select-none">
            <div className="size-3.5 rounded-full bg-[#eb001b]" />
            <div className="size-3.5 rounded-full bg-[#ff5f00] opacity-80" />
          </div>
        )
      case 'elo':
        return (
          <span className="rounded-xs border border-white/60 px-1 py-0.5 text-xs leading-none font-medium tracking-tighter text-white italic select-none">
            elo
          </span>
        )
      default:
        return <CardIcon className="size-3.5 text-white" />
    }
  }

  if (compact) {
    return (
      <div className="flex max-w-full min-w-0 shrink-0 items-center gap-3 rounded-lg border border-white/15 bg-[#111111] px-3 py-2 text-xs text-white">
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-sm border border-white/5 bg-white/10">
          {renderBrandLogo()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight font-semibold text-white">
            {name}
          </p>
          <p className="mt-0.5 truncate text-xs leading-none text-white">
            {bankName}
          </p>
        </div>
        <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-xs font-medium text-white select-none">
          D{closingDay}
        </span>
      </div>
    )
  }

  return (
    <div
      data-slot="credit-card-visual"
      style={{ borderTopColor: color }}
      className={`flex min-h-48 w-full max-w-[400px] min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-xl border border-t-[3px] border-white/15 bg-[#111111] p-5 [overflow-wrap:anywhere] text-white ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-xs text-white/70">{name}</span>
        <CardIcon className="size-4 shrink-0" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xl font-medium">{bankName}</p>
        <p className="mt-1 text-xs text-white/70">{holderName}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs">Fechamento · Dia {closingDay}</span>
        {renderBrandLogo()}
      </div>
    </div>
  )
}
