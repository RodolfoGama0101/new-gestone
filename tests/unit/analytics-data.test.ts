jest.mock('@/lib/firebase/config', () => ({ db: {} }))
import { AnalyticsDataService } from '@/services/analytics-data.service'
import { TransactionService } from '@/services/transaction.service'
import { CreditCardService } from '@/services/credit-card.service'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import type { Transaction } from '@/types/transaction'
afterEach(() => jest.restoreAllMocks())
test('relatório agrega todos os registros retornados e separa cartões sem duplicar totais', async () => {
  const rows = Array.from(
    { length: 105 },
    (_, index) =>
      ({
        id: String(index),
        type: 'expense',
        amount: 101,
        categoryId: 'cat',
        date: new Date(2024, 1, 10),
        creditCardId: 'card',
        cardClosingDay: 20,
      }) as Transaction,
  )
  jest.spyOn(TransactionService, 'getAll').mockResolvedValue(rows)
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  const filters = {
    startDate: new Date(2024, 1, 1),
    endDate: new Date(2024, 1, 29, 23, 59, 59, 999),
    dateBasis: 'competence' as const,
    search: 'compra',
  }
  const signal = new AbortController().signal
  const report = await AnalyticsDataService.getReport('user', filters, signal)
  expect(report.totals.expense).toBe(10605)
  expect(report.monthly[0].expense).toBe(10605)
  expect(report.cards).toEqual([
    { id: 'card', name: 'Cartão indisponível', amount: 10605 },
  ])
  expect(TransactionService.getAll).toHaveBeenCalledWith('user', filters, {
    cards: [],
    signal,
  })
})

test('relatório não retorna totais parciais quando a consulta falha', async () => {
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  jest
    .spyOn(TransactionService, 'getAll')
    .mockRejectedValue(new Error('Falha de leitura'))
  await expect(
    AnalyticsDataService.getReport('user', {
      startDate: new Date(2024, 1, 1),
      endDate: new Date(2024, 1, 29),
    }),
  ).rejects.toThrow('Falha de leitura')
})
test('relatório adota competência por padrão sem alterar o padrão dos serviços existentes', async () => {
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  const get = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([])
  await AnalyticsDataService.getReport('user', {
    startDate: new Date(2024, 1, 1),
    endDate: new Date(2024, 1, 29),
  })
  expect(get.mock.calls[0][1]?.dateBasis).toBe('competence')
})
test('dashboard limita os dois períodos e consulta reservas separadamente', async () => {
  const get = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([])
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  await AnalyticsDataService.getSummary(
    'user',
    new Date(2026, 8, 1),
    new Date(2026, 8, 15),
  )
  expect(get).toHaveBeenCalledWith(
    'user',
    {
      dateBasis: 'competence',
      startDate: new Date(2026, 7, 1),
      endDate: new Date(2026, 8, 30, 23, 59, 59, 999),
    },
    { cards: [], signal: undefined },
  )
  expect(get).toHaveBeenCalledWith(
    'user',
    {
      type: 'expense',
      startDate: new Date(2026, 8, 1),
      endDate: new Date(2026, 8, 15, 23, 59, 59, 999),
    },
    { signal: undefined },
  )
})
test.each([3, 6, 12])(
  'histórico de %i meses usa o intervalo de competência',
  async (months) => {
    const get = jest.spyOn(TransactionService, 'getAll').mockResolvedValue([])
    await AnalyticsDataService.getHistory('user', months, new Date(2026, 8, 15))
    expect(get).toHaveBeenCalledWith(
      'user',
      {
        dateBasis: 'competence',
        startDate: new Date(2026, 9 - months, 1),
        endDate: new Date(2026, 8, 30, 23, 59, 59, 999),
      },
      { signal: undefined },
    )
  },
)
test('lançamento fora do período não altera soma nem distribuição', () => {
  const tx = (month: number) =>
    ({
      type: 'expense',
      amount: 10000,
      date: new Date(2026, month, 5),
      categoryId: 'category',
    }) as Transaction
  const filtered = filterTransactionPeriod(
    [tx(7), tx(8), tx(9)],
    new Date(2026, 8, 1),
    new Date(2026, 8, 30, 23, 59, 59, 999),
  )
  expect(filtered.reduce((sum, item) => sum + item.amount, 0)).toBe(10000)
  expect(AnalyticsHelper.getCategoryShare(filtered, [])[0].value).toBe(10000)
})

test('recentes usam todos os candidatos do mês por competência, com desempate por ID', async () => {
  const rows = Array.from(
    { length: 105 },
    (_, i) =>
      ({
        id: String(i).padStart(3, '0'),
        type: 'income',
        amount: 1,
        date: new Date(2024, 1, 5),
        categoryId: 'income',
      }) as Transaction,
  )
  rows.push({
    id: 'card',
    type: 'expense',
    amount: 10,
    date: new Date(2024, 0, 25),
    creditCardId: 'card',
    cardClosingDay: 20,
    categoryId: 'expense',
  } as Transaction)
  rows.push({
    id: 'outside',
    type: 'income',
    amount: 999,
    date: new Date(2024, 0, 5),
  } as Transaction)
  jest.spyOn(TransactionService, 'getAll').mockResolvedValue(rows)
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  const result = await AnalyticsDataService.getSummary(
    'user',
    new Date(2024, 1, 1),
    new Date(2024, 2, 1),
  )
  expect(result.currentTransactions).toHaveLength(106)
  expect(result.currentTransactions.slice(0, 5).map((item) => item.id)).toEqual(
    ['104', '103', '102', '101', '100'],
  )
  expect(result.currentTransactions.some((item) => item.id === 'card')).toBe(
    true,
  )
  expect(result.currentTransactions.some((item) => item.id === 'outside')).toBe(
    false,
  )
  expect(result.balance).toBe(95)
})

test('desempate dos recentes mantém a ordem de IDs do Firestore sem colação por idioma', async () => {
  const rows = ['a', 'Z'].map(
    (id) =>
      ({
        id,
        type: 'income',
        amount: 1,
        date: new Date(2024, 1, 5),
      }) as Transaction,
  )
  jest.spyOn(TransactionService, 'getAll').mockResolvedValue(rows)
  jest.spyOn(CreditCardService, 'getAll').mockResolvedValue([])
  const result = await AnalyticsDataService.getSummary(
    'user',
    new Date(2024, 1, 1),
    new Date(2024, 2, 1),
  )
  expect(result.currentTransactions.map((item) => item.id)).toEqual(['a', 'Z'])
})
