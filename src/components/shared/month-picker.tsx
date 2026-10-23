'use client'

import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function MonthPicker({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string
  onChange: (month: string) => void
  disabled?: boolean
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value.slice(0, 4)))
  const select = (month: string) => {
    onChange(month)
    setOpen(false)
  }
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setYear(Number(value.slice(0, 4)))
        setOpen(next)
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className="border-input bg-background focus-visible:ring-ring flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm outline-none focus-visible:ring-2 disabled:opacity-50"
      >
        <CalendarDays
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden="true"
        />
        <span>
          {MONTHS[Number(value.slice(5)) - 1]} de {value.slice(0, 4)}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ano anterior"
            disabled={year <= 1}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="font-medium tabular-nums" aria-live="polite">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo ano"
            disabled={year >= 9999}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div
          className="grid grid-cols-3 gap-1"
          role="group"
          aria-label={`Meses de ${year}`}
        >
          {MONTHS.map((name, index) => {
            const month = `${String(year).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}`
            return (
              <Button
                key={name}
                variant={value === month ? 'default' : 'ghost'}
                aria-pressed={value === month}
                onClick={() => select(month)}
                className="min-w-0 px-1 text-xs"
              >
                {name}
              </Button>
            )
          })}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const now = new Date()
            select(
              `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            )
          }}
        >
          Este mês
        </Button>
      </PopoverContent>
    </Popover>
  )
}
