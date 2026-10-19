jest.mock('@/lib/firebase/config', () => ({ db: {} }))
import { AnalyticsDataService } from '@/services/analytics-data.service'
import { TransactionService } from '@/services/transaction.service'
import { CreditCardService } from '@/services/credit-card.service'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import type { Transaction } from '@/types/transaction'
afterEach(() => jest.restoreAllMocks())
test('dashboard limita os dois períodos e consulta reservas separadamente', async () => {
  const get = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([])
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  await AnalyticsDataService.getSummary('user', new Date(2026, 8, 1), new Date(2026, 8, 15))
  expect(get).toHaveBeenCalledWith('user', { startDate: new Date(2026, 6, 1), endDate: new Date(2026, 8, 30, 23, 59, 59, 999) })
  expect(get).toHaveBeenCalledWith('user', { type: 'expense', startDate: new Date(2026, 8, 1), endDate: new Date(2026, 8, 15, 23, 59, 59, 999) })
})
test.each([3, 6, 12])('histórico de %i meses tem início/fim e margem para cartão', async (months) => {
  const get = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([])
  await AnalyticsDataService.getHistory('user', months, new Date(2026, 8, 15))
  expect(get).toHaveBeenCalledWith('user', { startDate: new Date(2026, 8 - months, 1), endDate: new Date(2026, 8, 30, 23, 59, 59, 999) })
})
test('lançamento fora do período não altera soma nem distribuição', () => {
  const tx = (month: number) => ({ type: 'expense', amount: 10000, date: new Date(2026, month, 5), categoryId: 'category' } as Transaction)
  const filtered = filterTransactionPeriod([tx(7), tx(8), tx(9)], new Date(2026, 8, 1), new Date(2026, 8, 30, 23, 59, 59, 999))
  expect(filtered.reduce((sum, item) => sum + item.amount, 0)).toBe(10000)
  expect(AnalyticsHelper.getCategoryShare(filtered, [])[0].value).toBe(10000)
})
