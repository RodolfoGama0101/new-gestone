import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import { filterTransactionPeriod } from './transaction-date'
import { startOfMonth, endOfMonth } from 'date-fns'

export function parseBudgetAmount(value: string): number {
  if (!/^\d+(,\d{1,2})?$/.test(value))
    throw new Error('Use um valor positivo em reais, como 150,50.')
  const [integer, decimal = ''] = value.split(',')
  const cents = BigInt(integer) * BigInt(100) + BigInt(decimal.padEnd(2, '0'))
  if (cents <= BigInt(0) || cents > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Valor fora do limite permitido.')
  return Number(cents)
}

export function budgetProgress(
  transactions: Transaction[],
  month: Date,
  cards: CreditCard[],
) {
  const current = filterTransactionPeriod(
    transactions,
    startOfMonth(month),
    endOfMonth(month),
    cards,
  )
  const expenses: Record<string, number> = Object.create(null)
  let income = 0,
    expense = 0
  const add = (a: number, b: number) => {
    const value = a + b
    if (!Number.isSafeInteger(value))
      throw new Error('O total excede o limite seguro de cálculo.')
    return value
  }
  for (const tx of current) {
    if (tx.type === 'income') income = add(income, tx.amount)
    if (tx.type === 'expense') {
      expense = add(expense, tx.amount)
      expenses[tx.categoryId] = add(expenses[tx.categoryId] || 0, tx.amount)
    }
  }
  // Economia inclui saldo mantido e investimentos: estes não são despesas de consumo.
  return { expenses, savings: income - expense }
}
