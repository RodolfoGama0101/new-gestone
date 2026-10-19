import { getTransactionDate, filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { getDebitLimitDate } from '@/lib/utils/credit-card-billing'
import { AnalyticsService } from '@/services/analytics.service'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import type { Transaction } from '@/types/transaction'

const tx = (date: Date): Transaction => ({ id: 'purchase', type: 'expense', amount: 10000, date, categoryId: 'expense', creditCardId: 'card', cardClosingDay: 20, tags: [], notes: null, recurring: false, description: 'Compra', createdAt: date, updatedAt: date })

test.each([
  [new Date(2026, 7, 21), new Date(2026, 8, 20)],
  [new Date(2026, 11, 31), new Date(2027, 0, 20)],
  [new Date(2026, 0, 31), new Date(2026, 1, 20)],
])('competência consistente no dashboard, histórico e filtro: %s', (purchase, expected) => {
  const transaction = tx(purchase)
  expect(getTransactionDate(transaction)).toEqual(expected)
  const summary = AnalyticsService.calculateSummary([transaction], expected, [], expected)
  expect(summary.expense).toBe(10000)
  expect(summary.dailyBalance.at(-1)?.balance).toBe(summary.balance)
  expect(summary.dailyBalance.at(-1)?.date).toBe(`${String(expected.getDate()).padStart(2, '0')}/${String(expected.getMonth() + 1).padStart(2, '0')}`)
  expect(AnalyticsHelper.getMonthlyHistory([transaction], 1, expected)[0].expense).toBe(10000)
  expect(filterTransactionPeriod([transaction], new Date(expected.getFullYear(), expected.getMonth(), 1), new Date(expected.getFullYear(), expected.getMonth() + 1, 0))).toHaveLength(1)
})

test('fevereiro e meses curtos não transbordam ao definir dia de fechamento', () => {
  expect(getDebitLimitDate(30, new Date(2026, 0, 31))).toEqual(new Date(2026, 1, 28))
  expect(getDebitLimitDate(30, new Date(2028, 0, 31))).toEqual(new Date(2028, 1, 29))
})

test('fechamento registrado na compra prevalece sobre mudanças do cartão', () => {
  expect(getTransactionDate(tx(new Date(2026, 7, 21)), [{ id: 'card', closingDay: 25 } as never])).toEqual(new Date(2026, 8, 20))
})
