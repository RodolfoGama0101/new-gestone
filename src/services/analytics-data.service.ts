import { startOfMonth, endOfMonth, endOfDay, subMonths } from 'date-fns'
import { TransactionService } from './transaction.service'
import { CreditCardService } from './credit-card.service'
import { AnalyticsService } from './analytics.service'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { parseFirestoreDate } from '@/lib/utils/parse-date'

export const AnalyticsDataService = {
  async getSummary(
    userId: string,
    month: Date,
    reference: Date,
    signal?: AbortSignal,
  ) {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const cutoff = new Date(
      Math.min(endOfDay(reference).getTime(), end.getTime()),
    )
    const cards = await CreditCardService.getAll(userId)
    const [transactions, reservations] = await Promise.all([
      TransactionService.getAll(
        userId,
        {
          dateBasis: 'competence',
          startDate: subMonths(start, 1),
          endDate: end,
        },
        { cards, signal },
      ),
      cutoff < start
        ? Promise.resolve([])
        : TransactionService.getAll(
            userId,
            { type: 'expense', startDate: start, endDate: cutoff },
            { signal },
          ),
    ])
    return {
      ...AnalyticsService.calculateSummary(
        transactions,
        month,
        cards,
        reference,
        reservations,
      ),
      currentTransactions: filterTransactionPeriod(
        transactions,
        start,
        end,
        cards,
      ).toSorted(
        (a, b) =>
          parseFirestoreDate(b.date).getTime() -
            parseFirestoreDate(a.date).getTime() ||
          (a.id === b.id ? 0 : a.id < b.id ? 1 : -1),
      ),
    }
  },
  getHistory(
    userId: string,
    months: number,
    reference: Date,
    signal?: AbortSignal,
  ) {
    return TransactionService.getAll(
      userId,
      {
        dateBasis: 'competence',
        startDate: subMonths(startOfMonth(reference), months - 1),
        endDate: endOfMonth(reference),
      },
      { signal },
    )
  },
}
