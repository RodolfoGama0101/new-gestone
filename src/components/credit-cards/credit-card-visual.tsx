'use client'

import { CreditCard as CardIcon, Wifi } from 'lucide-react'
import { cardAppearance } from '@/lib/utils/card-appearance'
import { cn } from '@/lib/utils'

interface CreditCardVisualProps {
  name: string
  bankName: string
  brand: 'visa' | 'mastercard' | 'elo' | 'other'
  holderName: string
  closingDay: number
  color: string
  className?: string
  compact?: boolean
}

function CardBrand({ brand }: Pick<CreditCardVisualProps, 'brand'>) {
  if (brand === 'mastercard') {
    return (
      <span role="img" aria-label="Mastercard" className="flex -space-x-2">
        <span className="size-7 rounded-full bg-[#eb001b]" />
        <span className="size-7 rounded-full bg-[#ff9900] opacity-90" />
      </span>
    )
  }
  if (brand === 'other')
    return <CardIcon className="size-6" aria-label="Outra bandeira" />
  return (
    <span className="text-2xl font-semibold tracking-tighter italic">
      {brand === 'visa' ? 'VISA' : 'elo'}
    </span>
  )
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
  const appearance = cardAppearance(color)

  if (compact) {
    return (
      <div
        style={{
          backgroundColor: appearance.color,
          color: appearance.foreground,
        }}
        className={cn(
          'flex max-w-full min-w-0 items-center gap-3 rounded-lg border border-black/10 px-3 py-2 text-xs',
          className,
        )}
      >
        <CardIcon className="size-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="mt-0.5 truncate">{bankName}</p>
        </div>
        <span className="shrink-0">Fecha dia {closingDay}</span>
      </div>
    )
  }

  return (
    <div
      data-slot="credit-card-visual"
      style={{
        backgroundColor: appearance.color,
        color: appearance.foreground,
        backgroundImage: appearance.backgroundImage,
      }}
      className={cn(
        'relative isolate flex min-h-52 w-full max-w-[400px] min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-black/10 p-5 text-left [overflow-wrap:anywhere] shadow-[inset_0_1px_0_#ffffff30,0_8px_20px_-12px_#00000060] sm:min-h-56 sm:p-6',
        className,
      )}
    >
      <div
        aria-hidden="true"
        style={{
          borderColor:
            appearance.foreground === '#ffffff' ? '#000000' : '#ffffff',
        }}
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full border-[32px] border-current opacity-[0.04]"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg leading-tight font-semibold tracking-tight">
            {bankName}
          </p>
          <p className="mt-1 text-xs">{name}</p>
        </div>
        <Wifi className="mt-1 size-5 shrink-0 rotate-90" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <svg viewBox="0 0 44 34" className="h-8 w-11 shrink-0" fill="none">
          <rect
            x=".5"
            y=".5"
            width="43"
            height="33"
            rx="7"
            fill="#d8c49a"
            stroke="#00000030"
          />
          <path
            d="M15 0v10L9 17l6 7v10M29 0v10l6 7-6 7v10M0 11h15m14 0h15M0 23h15m14 0h15M15 10h14v14H15z"
            stroke="#66512d"
            strokeOpacity=".55"
          />
        </svg>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium tracking-widest uppercase">
            Titular
          </p>
          <p className="mt-1 text-xs font-medium tracking-wider uppercase">
            {holderName}
          </p>
        </div>
        <div className="shrink-0">
          <CardBrand brand={brand} />
        </div>
      </div>
    </div>
  )
}
