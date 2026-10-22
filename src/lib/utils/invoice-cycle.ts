import { addDays, addMonths, endOfDay, startOfMonth } from 'date-fns'
import type { CreditCard } from '@/types/credit-card'

function dayInMonth(month: Date, day: number) {
  return new Date(
    month.getFullYear(),
    month.getMonth(),
    Math.min(
      day,
      new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    ),
  )
}
export function invoiceCycle(
  card: Pick<CreditCard, 'closingDay' | 'dueDay'>,
  month: Date,
) {
  const closing = dayInMonth(month, card.closingDay)
  const start = addDays(
    dayInMonth(addMonths(startOfMonth(month), -1), card.closingDay),
    1,
  )
  const due = card.dueDay
    ? dayInMonth(
        card.dueDay <= card.closingDay
          ? addMonths(startOfMonth(month), 1)
          : month,
        card.dueDay,
      )
    : null
  return { start, closing, closesAt: endOfDay(closing), due }
}
