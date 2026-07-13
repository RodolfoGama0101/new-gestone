'use client'

import * as React from 'react'

interface TooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
  payload?: Record<string, unknown>
}

interface GeistChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  valueFormatter?: (value: number) => string
}

export function GeistChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: GeistChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const formatValue = (val: number | string | undefined) => {
    if (val === undefined) return ''
    const numVal = typeof val === 'number' ? val : Number(val)
    if (isNaN(numVal)) return String(val)
    return valueFormatter ? valueFormatter(numVal) : numVal.toLocaleString('pt-BR')
  }

  return (
    <div className="rounded-md border border-border bg-popover p-2.5 shadow-sm text-xs select-none min-w-[120px] animate-in fade-in duration-75">
      {label && (
        <div className="font-semibold text-foreground mb-1.5 capitalize">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const isIncome = item.name === 'income' || item.name?.toLowerCase().includes('receita')
          const isExpense = item.name === 'expense' || item.name?.toLowerCase().includes('despesa')
          
          let displayColor = item.color || 'var(--primary)'
          let displayName = item.name

          if (isIncome) {
            displayColor = 'var(--income)'
            displayName = 'Receita'
          } else if (isExpense) {
            displayColor = 'var(--expense)'
            displayName = 'Despesa'
          }

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span 
                  className="size-1.5 rounded-full shrink-0" 
                  style={{ backgroundColor: displayColor }}
                />
                <span className="text-[11px] font-medium capitalize">{displayName}</span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-foreground tabular-nums">
                {formatValue(item.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
