'use client'

import { addMonths, format, isSameMonth, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MonthSelector({
  value,
  onChange,
  label = 'Mês de referência',
  disabled = false,
}: {
  value: Date
  onChange: (value: Date) => void
  label?: string
  disabled?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex max-w-full flex-wrap items-center gap-2"
    >
      <div className="bg-card flex max-w-full min-w-0 flex-wrap items-center rounded-md border p-1 sm:flex-nowrap">
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Mês anterior"
          onClick={() => onChange(startOfMonth(addMonths(value, -1)))}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-0 px-2 text-center text-sm font-medium [overflow-wrap:anywhere] capitalize"
        >
          {format(value, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Próximo mês"
          onClick={() => onChange(startOfMonth(addMonths(value, 1)))}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        disabled={disabled || isSameMonth(value, new Date())}
        onClick={() => onChange(startOfMonth(new Date()))}
      >
        Mês atual
      </Button>
    </div>
  )
}
