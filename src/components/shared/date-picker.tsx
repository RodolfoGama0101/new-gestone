'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps extends Pick<
  React.ComponentProps<'button'>,
  'aria-label' | 'aria-invalid' | 'aria-describedby' | 'ref' | 'onBlur' | 'name'
> {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  disabled?: boolean
  className?: string
  id?: string
  clearable?: boolean
  dateFormat?: string
  minDate?: Date
}

export function DatePicker({
  date,
  setDate,
  disabled = false,
  className = '',
  id,
  clearable = false,
  dateFormat = "dd 'de' MMMM 'de' yyyy",
  minDate,
  ...buttonProps
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    setIsOpen(false) // fecha o popover após a seleção
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        {...buttonProps}
        type="button"
        id={id}
        disabled={disabled}
        className={cn(
          'border-border bg-background focus-visible:ring-ring inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-start gap-1.5 rounded-lg border px-3 py-2 text-left text-sm font-normal whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
          !date && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="text-muted-foreground mr-2 size-4 shrink-0" aria-hidden="true" />
        {date ? (
          <span className="min-w-0 truncate">
            {format(date, dateFormat, { locale: ptBR })}
          </span>
        ) : (
          <span className="min-w-0 truncate">Selecione uma data</span>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="border-border bg-popover w-auto p-0"
        align="start"
      >
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={handleSelect}
          disabled={disabled ? true : minDate ? { before: minDate } : undefined}
          locale={ptBR}
        />
        {clearable && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => handleSelect(undefined)}
            >
              Limpar data
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
