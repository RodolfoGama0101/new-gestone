import {
  occurrenceDate,
  installmentAmount,
  installmentMonth,
} from '@/lib/utils/transaction-series'
import { getTransactionDate } from '@/lib/utils/transaction-date'
import type { Transaction } from '@/types/transaction'

it('mantém a âncora 31 após fevereiro, ano bissexto e virada do ano', () => {
  const start = new Date(2024, 0, 31)
  expect(occurrenceDate(start, 1).getDate()).toBe(29)
  expect(occurrenceDate(start, 2).getDate()).toBe(31)
  expect(occurrenceDate(start, 12).getFullYear()).toBe(2025)
  expect(occurrenceDate(new Date(2025, 0, 30), 1).getDate()).toBe(28)
  expect(occurrenceDate(new Date(2025, 0, 29), 2).getDate()).toBe(29)
})
it('preserva o fuso de criação entre dispositivos', () => {
  expect(
    occurrenceDate(new Date('2026-01-31T03:00:00Z'), 1, 180).toISOString(),
  ).toBe('2026-02-28T03:00:00.000Z')
  expect(
    occurrenceDate(new Date('2026-01-30T15:00:00Z'), 1, -540).toISOString(),
  ).toBe('2026-02-27T15:00:00.000Z')
})
it('distribui centavos sem perda inclusive no limite seguro', () => {
  expect([0, 1, 2].map((i) => installmentAmount(10000, 3, i))).toEqual([
    3334, 3333, 3333,
  ])
  const total = Number.MAX_SAFE_INTEGER
  expect(
    Array.from({ length: 120 }, (_, i) =>
      installmentAmount(total, 120, i),
    ).reduce((a, b) => a + BigInt(b), BigInt(0)),
  ).toBe(BigInt(total))
  for (const [amount, count] of [
    [1, 2],
    [100, 121],
    [1.5, 2],
  ])
    expect(() => installmentAmount(amount, count, 0)).toThrow()
})
it('não acumula parcelas no mesmo ciclo quando fevereiro encurta a data da compra', () => {
  const start = new Date(2026, 0, 31)
  const months = [0, 1, 2].map((i) => installmentMonth(start, i, 28))
  expect(months).toEqual(['2026-02', '2026-03', '2026-04'])
  expect(
    getTransactionDate({
      type: 'expense',
      creditCardId: 'card',
      cardClosingDay: 28,
      date: new Date(2026, 1, 28),
      installmentMonth: months[1],
    } as Transaction),
  ).toEqual(new Date(2026, 2, 28))
})
