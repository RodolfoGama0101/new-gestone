import type { TransactionSeries } from '@/types/transaction-series'
import { parseFirestoreDate } from './parse-date'
import {
  installmentAmount,
  installmentMonth,
  occurrenceDate,
} from './transaction-series'

// Programação original: não infere existência atual nem pagamento pelo cursor.
export function seriesSchedule(item: TransactionSeries) {
  const start = parseFirestoreDate(item.date)
  const rows = []
  for (let index = 0; index < Math.min(item.count, 1200); index++) {
    const date = occurrenceDate(start, index, item.timezoneOffset)
    if (
      (item.endDate && date > parseFirestoreDate(item.endDate)) ||
      (item.cancelledFrom && date >= parseFirestoreDate(item.cancelledFrom))
    )
      break
    const civil = new Date(date.getTime() - item.timezoneOffset * 60000)
    const month =
      item.creditCardId && item.cardClosingDay
        ? installmentMonth(
            item.kind === 'installment' ? start : date,
            item.kind === 'installment' ? index : 0,
            item.cardClosingDay,
            item.timezoneOffset,
          )
        : `${civil.getUTCFullYear()}-${String(civil.getUTCMonth() + 1).padStart(2, '0')}`
    rows.push({
      index,
      date,
      month,
      processed: index < item.nextIndex,
      amount:
        item.kind === 'installment'
          ? installmentAmount(item.amount, item.count, index)
          : item.amount,
    })
  }
  return rows
}
