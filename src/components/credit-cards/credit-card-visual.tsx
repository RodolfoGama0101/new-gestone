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
          <span className="italic font-bold text-white text-base tracking-wider select-none leading-none">
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
          <span className="font-extrabold text-white text-[10px] select-none tracking-tighter italic border border-white/60 px-1 py-0.5 rounded-xs leading-none">
            elo
          </span>
        )
      default:
        return <CardIcon className="size-3.5 text-white/70" />
    }
  }

  // Estilo com gradiente baseado na cor principal
  const cardStyle = {
    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 45%, ${color}aa 100%)`,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }

  if (compact) {
    return (
      <div
        style={cardStyle}
        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/10 text-white shadow-xs shrink-0 min-w-[180px] max-w-[240px] text-xs"
      >
        <div className="size-6.5 rounded-sm bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
          {renderBrandLogo()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate leading-tight text-white">{name}</p>
          <p className="text-[9px] text-white/75 truncate leading-none mt-0.5">{bankName}</p>
        </div>
        <span className="text-[9px] bg-white/15 px-1.5 py-0.5 rounded-full font-bold select-none text-white">
          D{closingDay}
        </span>
      </div>
    )
  }

  return (
    <div
      style={cardStyle}
      className={`relative aspect-[1.586/1] w-full rounded-xl p-5 flex flex-col justify-between text-white shadow-md overflow-hidden border border-white/15 group transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] select-none ${className}`}
    >
      {/* Brilho reflexo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Linha superior: Banco e Bandeira */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide uppercase truncate max-w-[70%] text-white">
          {bankName || 'Banco'}
        </span>
        <div className="h-5 flex items-center">{renderBrandLogo()}</div>
      </div>

      {/* Linha do meio: Chip e Nome do cartão */}
      <div className="flex items-center justify-between mt-1">
        {/* Chip decorativo */}
        <div className="w-8 h-6 rounded-md bg-gradient-to-r from-[#ffe082] to-[#ffb300] relative border border-black/10 shadow-inner flex flex-col justify-between p-1 shrink-0">
          <div className="w-full h-px bg-black/15" />
          <div className="w-full h-px bg-black/15" />
          <div className="w-full h-px bg-black/15" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-black/15" />
        </div>
        <span className="text-[9px] font-semibold bg-black/15 px-2 py-0.5 rounded-md border border-white/5 uppercase truncate max-w-[60%] text-white">
          {name || 'Nome'}
        </span>
      </div>

      {/* Linha inferior: Titular e Fechamento */}
      <div className="flex items-end justify-between mt-2">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[8px] uppercase tracking-wider text-white/70 leading-none">Titular</p>
          <p className="text-xs font-semibold uppercase tracking-wide truncate mt-1 text-white">
            {holderName || 'TITULAR'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] uppercase tracking-wider text-white/70 leading-none">Fecha</p>
          <p className="text-xs font-bold mt-1 text-white">Dia {closingDay || 1}</p>
        </div>
      </div>
    </div>
  )
}
