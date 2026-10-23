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
          <span className="text-base leading-none font-bold tracking-wider text-white italic select-none">
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
          <span className="rounded-xs border border-white/60 px-1 py-0.5 text-xs leading-none font-extrabold tracking-tighter text-white italic select-none">
            elo
          </span>
        )
      default:
        return <CardIcon className="size-3.5 text-white" />
    }
  }

  // Estilo com gradiente baseado na cor principal
  const cardStyle = {
    background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), linear-gradient(135deg, ${color} 0%, ${color}dd 45%, ${color}aa 100%)`,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }

  if (compact) {
    return (
      <div
        style={cardStyle}
        className="flex max-w-[240px] min-w-[180px] shrink-0 items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white shadow-xs"
      >
        <div className="flex size-6.5 shrink-0 items-center justify-center rounded-sm border border-white/5 bg-white/10">
          {renderBrandLogo()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate leading-tight font-semibold text-white">
            {name}
          </p>
          <p className="mt-0.5 truncate text-[9px] leading-none text-white">
            {bankName}
          </p>
        </div>
        <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-bold text-white select-none">
          D{closingDay}
        </span>
      </div>
    )
  }

  return (
    <div
      style={cardStyle}
      className={`group relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-xl border border-white/15 p-5 text-white shadow-md transition-transform duration-300 select-none hover:-translate-y-1 hover:scale-[1.01] ${className}`}
    >
      {/* Brilho reflexo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Linha superior: Banco e Bandeira */}
      <div className="flex items-center justify-between">
        <span className="max-w-[70%] truncate text-xs font-bold tracking-wide text-white uppercase">
          {bankName || 'Banco'}
        </span>
        <div className="flex h-5 items-center">{renderBrandLogo()}</div>
      </div>

      {/* Linha do meio: Chip e Nome do cartão */}
      <div className="mt-1 flex items-center justify-between">
        {/* Chip decorativo */}
        <div className="relative flex h-6 w-8 shrink-0 flex-col justify-between rounded-md border border-black/10 bg-gradient-to-r from-[#ffe082] to-[#ffb300] p-1 shadow-inner">
          <div className="h-px w-full bg-black/15" />
          <div className="h-px w-full bg-black/15" />
          <div className="h-px w-full bg-black/15" />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/15" />
        </div>
        <span className="max-w-[60%] truncate rounded-md border border-white/5 bg-black/15 px-2 py-0.5 text-[9px] font-semibold text-white uppercase">
          {name || 'Nome'}
        </span>
      </div>

      {/* Linha inferior: Titular e Fechamento */}
      <div className="mt-2 flex items-end justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[8px] leading-none tracking-wider text-white uppercase">
            Titular
          </p>
          <p className="mt-1 truncate text-xs font-semibold tracking-wide text-white uppercase">
            {holderName || 'TITULAR'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] leading-none tracking-wider text-white uppercase">
            Fecha
          </p>
          <p className="mt-1 text-xs font-bold text-white">
            Dia {closingDay || 1}
          </p>
        </div>
      </div>
    </div>
  )
}
