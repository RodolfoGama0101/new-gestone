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

interface DatePickerProps extends Pick<
  React.ComponentProps<'button'>,
  'aria-invalid' | 'aria-describedby' | 'ref' | 'onBlur' | 'name'
> {
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
        id={id}
        disabled={disabled}
        className={cn(
          'border-border bg-background focus-visible:ring-ring inline-flex min-h-11 w-full shrink-0 cursor-pointer items-center justify-start gap-1.5 rounded-md border px-3 py-2 text-left text-sm font-normal whitespace-normal transition-all outline-none select-none focus-visible:ring-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
          !date && 'text-muted-foreground',
          className,
        )}
      >
        <CalendarIcon className="text-muted-foreground mr-2 size-4" />
        {date ? (
          format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
        ) : (
          <span>Selecione uma data</span>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="border-border bg-popover w-auto max-w-[calc(100vw-8px)] overflow-x-auto p-0"
        align="start"
      >
        <Calendar
          className="p-0 [--cell-size:44px] sm:p-3"
          classNames={{ week: 'mt-2 flex w-full justify-center' }}
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={disabled}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
