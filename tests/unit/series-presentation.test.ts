import type { TransactionSeries } from '@/types/transaction-series'
import { seriesSchedule } from '@/lib/utils/series-presentation'

const series = (changes: Partial<TransactionSeries> = {}) =>
  ({
    id: 'test',
    kind: 'recurring',
    count: 1200,
    nextIndex: 1,
    date: new Date('2026-01-31T03:00:00Z'),
    timezoneOffset: 180,
    endDate: new Date('2026-03-31T23:59:59Z'),
    cancelledFrom: null,
    type: 'expense',
    amount: 10000,
    description: 'Mensalidade',
    categoryId: 'cat',
    ...changes,
  }) as TransactionSeries

it('programação mantém âncora, fim inclusivo e futuras não geradas', () => {
  const rows = seriesSchedule(series())
  expect(rows.map((row) => row.date.toISOString())).toEqual([
    '2026-01-31T03:00:00.000Z',
    '2026-02-28T03:00:00.000Z',
    '2026-03-31T03:00:00.000Z',
  ])
  expect(rows.map((row) => row.processed)).toEqual([true, false, false])
  expect(rows.map((row) => row.month)).toEqual([
    '2026-01',
    '2026-02',
    '2026-03',
  ])
})

it('parcelas processadas ainda têm competências futuras e centavos exatos', () => {
  const rows = seriesSchedule(
    series({
      kind: 'installment',
      count: 3,
      nextIndex: 3,
      creditCardId: 'card',
      cardClosingDay: 28,
      endDate: null,
    }),
  )
  expect(rows.map((row) => row.month)).toEqual([
    '2026-02',
    '2026-03',
    '2026-04',
  ])
  expect(rows.map((row) => row.amount)).toEqual([3334, 3333, 3333])
  expect(rows.every((row) => row.processed)).toBe(true)
})

it('recorrência no cartão usa fechamento de cada ocorrência e corte encerra programação', () => {
  const rows = seriesSchedule(
    series({
      creditCardId: 'card',
      cardClosingDay: 28,
      cancelledFrom: new Date('2026-03-31T03:00:00Z'),
    }),
  )
  expect(rows.map((row) => row.month)).toEqual(['2026-02', '2026-02'])
  expect(rows).toHaveLength(2)
})
