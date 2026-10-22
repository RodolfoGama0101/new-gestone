import { budgetProgress, parseBudgetAmount } from '@/lib/utils/budget'
import type { Transaction } from '@/types/transaction'

const tx = (
  amount: number,
  type: Transaction['type'],
  date: Date,
  extra = {},
) => ({ amount, type, date, categoryId: 'food', ...extra }) as Transaction
it('valida centavos sem arredondamento ou ponto flutuante', () => {
  expect(parseBudgetAmount('0,01')).toBe(1)
  expect(parseBudgetAmount('100,5')).toBe(10050)
  expect(parseBudgetAmount('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER)
  for (const value of ['0', '-1', '1,001', '1.5', '90071992547409,92'])
    expect(() => parseBudgetAmount(value)).toThrow()
})
it('segue competência do cartão na virada do ano e conta investimento uma vez na economia', () => {
  const data = [
    tx(100000, 'income', new Date(2027, 0, 1)),
    tx(10000, 'expense', new Date(2026, 11, 20), {
      creditCardId: 'card',
      cardClosingDay: 15,
    }),
    tx(5000, 'expense', new Date(2026, 11, 1)),
    tx(20000, 'investment', new Date(2027, 0, 5)),
  ]
  expect(budgetProgress(data, new Date(2027, 0, 1), [])).toEqual({
    expenses: { food: 10000 },
    savings: 90000,
  })
  expect(budgetProgress(data, new Date(2026, 11, 1), [])).toEqual({
    expenses: { food: 5000 },
    savings: -5000,
  })
})
