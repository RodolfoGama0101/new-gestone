import { format, differenceInCalendarDays } from 'date-fns'
import {
  previousReportPeriod,
  reportPeriod,
  reportTotals,
  reportComparison,
  reportMonthlyHistory,
  reportDetailHref,
} from '@/lib/utils/financial-report'
import { matchesTransactionFilters } from '@/lib/utils/transaction-query'
import type { Transaction } from '@/types/transaction'
import type { TransactionFilterValues } from '@/lib/utils/transaction-filters'
import { resolveTransactionFilters } from '@/lib/utils/transaction-filters'

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 'tx',
  type: 'expense',
  amount: 100,
  categoryId: 'cat',
  description: 'Compra',
  date: new Date(2024, 0, 25, 12),
  tags: [],
  notes: null,
  recurring: false,
  createdAt: null,
  updatedAt: null,
  ...overrides,
})

test.each([1, 3, 6, 12])(
  'janela de %i meses termina no mês global e compara meses anteriores',
  (count) => {
    const current = reportPeriod(new Date(2024, 1, 10), count)
    const previous = previousReportPeriod(
      current.startDate,
      current.endDate,
      count,
    )
    expect(format(current.endDate, 'yyyy-MM-dd')).toBe('2024-02-29')
    expect(format(previous.endDate, 'yyyy-MM-dd')).toBe(
      format(
        new Date(
          current.startDate.getFullYear(),
          current.startDate.getMonth(),
          0,
        ),
        'yyyy-MM-dd',
      ),
    )
    expect(previous.startDate.getDate()).toBe(1)
    expect(
      (previous.endDate.getFullYear() - previous.startDate.getFullYear()) * 12 +
        previous.endDate.getMonth() -
        previous.startDate.getMonth() +
        1,
    ).toBe(count)
  },
)

test('intervalo personalizado compara dias civis inclusive em ano bissexto e virada de ano', () => {
  for (const [start, end] of [
    [new Date(2024, 1, 25), new Date(2024, 2, 5)],
    [new Date(2024, 0, 1), new Date(2024, 0, 1)],
  ]) {
    const previous = previousReportPeriod(start, end)
    expect(differenceInCalendarDays(previous.endDate, previous.startDate)).toBe(
      differenceInCalendarDays(end, start),
    )
    expect(differenceInCalendarDays(start, previous.endDate)).toBe(1)
    expect(previous.endDate.getHours()).toBe(23)
  }
})

test('fórmulas separam resultado, economia e percentual de aportes; zero não inventa comparação', () => {
  expect(
    reportTotals([
      tx({ type: 'income', amount: 10000 }),
      tx({ amount: 7000 }),
      tx({ type: 'investment', amount: 4000 }),
    ]),
  ).toEqual({
    income: 10000,
    expense: 7000,
    investment: 4000,
    savings: 3000,
    result: -1000,
    investmentRate: 40,
  })
  expect(reportTotals([]).investmentRate).toBeNull()
  expect(reportComparison(100, 0)).toBeNull()
  expect(reportComparison(0, 100)).toBe(-100)
  expect(reportComparison(-50, -100)).toBe(50)
  expect(() =>
    reportTotals([tx({ amount: Number.MAX_SAFE_INTEGER }), tx({ amount: 1 })]),
  ).toThrow(RangeError)
})

test('evolução filtra o intervalo exato e soma só parcelas e recorrências registradas, pela base escolhida', () => {
  const transactions = [
    tx({ id: 'card', creditCardId: 'card', cardClosingDay: 20 }),
    tx({
      id: 'installment',
      creditCardId: 'card',
      installmentTotal: 3,
      installmentMonth: '2024-02',
      cardClosingDay: 20,
    }),
    tx({
      id: 'income',
      type: 'income',
      amount: 1000,
      date: new Date(2024, 1, 10),
      recurring: true,
    }),
    tx({ id: 'outside', date: new Date(2024, 1, 1), amount: 99999 }),
  ]
  const start = new Date(2024, 1, 10),
    end = new Date(2024, 1, 25, 23, 59, 59, 999)
  const competence = reportMonthlyHistory(
    transactions,
    start,
    end,
    [],
    'competence',
  )
  expect(competence[0]).toMatchObject({
    expense: 200,
    income: 1000,
    balance: 800,
    savings: 800,
    transactionIds: ['card', 'installment', 'income'],
  })
  expect(
    reportMonthlyHistory(transactions, start, end, [], 'purchase')[0].expense,
  ).toBe(0)
  const empty = reportMonthlyHistory(
    [],
    new Date(2024, 0, 1),
    new Date(2024, 2, 31),
    [],
    'competence',
  )
  expect(empty.map((month) => month.balance)).toEqual([0, 0, 0])
})

test('detalhamento reproduz filtros, datas e conjunto de competência do indicador', () => {
  const values: TransactionFilterValues = {
    type: 'expense',
    search: 'compra',
    categoryId: 'cat',
    creditCardId: 'card',
    startDate: '',
    endDate: '',
    dateBasis: 'competence',
    minAmount: '1,00',
    maxAmount: '2,00',
    modality: 'installment',
  }
  const url = new URL(
    reportDetailHref(
      values,
      '2024-02',
      new Date(2024, 1, 1),
      new Date(2024, 1, 29),
    ),
    'https://example.test',
  )
  const detail = resolveTransactionFilters(
    Object.fromEntries(url.searchParams) as unknown as TransactionFilterValues,
    '2024-02',
  )
  const transaction = tx({
    creditCardId: 'card',
    cardClosingDay: 20,
    installmentTotal: 3,
    installmentMonth: '2024-02',
  })
  expect(detail.valid).toBe(true)
  expect(matchesTransactionFilters(transaction, detail.criteria)).toBe(true)
  expect(url.searchParams.get('minAmount')).toBe('1,00')
  expect(url.searchParams.get('startDate')).toBe('2024-02-01')
})
