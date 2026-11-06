import { startOfMonth, endOfMonth, endOfDay, subMonths } from 'date-fns'
import { TransactionService } from './transaction.service'
import { CreditCardService } from './credit-card.service'
import { AnalyticsService } from './analytics.service'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import type { GetTransactionsFilters } from './transaction.service'
import {
  reportMonthlyHistory,
  reportTotals,
  safeReportAdd,
} from '@/lib/utils/financial-report'

export const AnalyticsDataService = {
  async getReport(
    userId: string,
    filters: GetTransactionsFilters,
    signal?: AbortSignal,
  ) {
    if (!filters.startDate || !filters.endDate)
      throw new Error('Informe as duas datas do relatório.')
    const criteria = {
      ...filters,
      dateBasis: filters.dateBasis ?? 'competence',
    }
    const cards = await CreditCardService.getAll(userId)
    const transactions = await TransactionService.getAll(userId, criteria, {
      cards,
      signal,
    })
    const totals = reportTotals(transactions)
    const monthly = reportMonthlyHistory(
      transactions,
      filters.startDate,
      filters.endDate,
      cards,
      criteria.dateBasis,
    )
    const cardTotals = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.creditCardId)
        cardTotals.set(
          tx.creditCardId,
          safeReportAdd(cardTotals.get(tx.creditCardId) ?? 0, tx.amount),
        )
    }
    return {
      transactions,
      totals,
      monthly,
      cards: [...cardTotals]
        .map(([id, amount]) => ({
          id,
          amount,
          name:
            cards.find((card) => card.id === id)?.name ?? 'Cartão indisponível',
        }))
        .sort((a, b) => b.amount - a.amount),
    }
  },
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
