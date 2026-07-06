'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  date,
  setDate,
  disabled = false,
  className = '',
  id,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    setIsOpen(false) // fecha o popover após a seleção
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          'inline-flex shrink-0 items-center justify-start rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal whitespace-nowrap transition-all outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 w-full justify-start text-left cursor-pointer',
          !date && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
        {date ? (
          format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        ) : (
          <span>Selecione uma data</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border bg-popover" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
