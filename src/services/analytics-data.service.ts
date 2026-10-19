import { startOfMonth, endOfMonth, endOfDay, subMonths } from 'date-fns'
import { TransactionService } from './transaction.service'
import { CreditCardService } from './credit-card.service'
import { AnalyticsService } from './analytics.service'

export const AnalyticsDataService = {
  async getSummary(userId: string, month: Date, reference: Date) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const cutoff = new Date(Math.min(endOfDay(reference).getTime(), end.getTime()))
    const [transactions, cards, reservations] = await Promise.all([
      TransactionService.getAll(userId, { startDate: subMonths(start, 2), endDate: end }),
      CreditCardService.getAll(userId),
      cutoff < start ? Promise.resolve([]) : TransactionService.getAll(userId, { type: 'expense', startDate: start, endDate: cutoff }),
    ])
    return AnalyticsService.calculateSummary(transactions, month, cards, reference, reservations)
  },
  getHistory(userId: string, months: number, reference: Date) {
    return TransactionService.getAll(userId, {
      startDate: subMonths(startOfMonth(reference), months),
      endDate: endOfMonth(reference),
    })
  },
}
