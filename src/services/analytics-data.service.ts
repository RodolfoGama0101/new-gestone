import { startOfMonth, endOfMonth, endOfDay, subMonths } from 'date-fns'
import { TransactionService } from './transaction.service'
import { CreditCardService } from './credit-card.service'
import { AnalyticsService } from './analytics.service'

export const AnalyticsDataService = {
  async getSummary(userId: string, month: Date, reference: Date, signal?: AbortSignal) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const cutoff = new Date(Math.min(endOfDay(reference).getTime(), end.getTime()))
    const cards = await CreditCardService.getAll(userId)
    const [transactions, reservations] = await Promise.all([
      TransactionService.getAll(userId, { dateBasis: 'competence', startDate: subMonths(start, 1), endDate: end }, { cards, signal }),
      cutoff < start ? Promise.resolve([]) : TransactionService.getAll(userId, { type: 'expense', startDate: start, endDate: cutoff }, { signal }),
    ])
    return AnalyticsService.calculateSummary(transactions, month, cards, reference, reservations)
  },
  getHistory(userId: string, months: number, reference: Date, signal?: AbortSignal) {
    return TransactionService.getAll(userId, {
      dateBasis: 'competence',
      startDate: subMonths(startOfMonth(reference), months - 1),
      endDate: endOfMonth(reference),
    }, { signal })
  },
}
