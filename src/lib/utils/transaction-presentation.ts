import { ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react'
import type { Transaction } from '@/types/transaction'
import { formatMoney } from './format-money'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseFirestoreDate } from './parse-date'

export const transactionPresentation = {
  income: {
    label: 'Receita',
    icon: ArrowUpRight,
    sign: '+',
    color: 'text-income',
    background: 'bg-income/10',
  },
  expense: {
    label: 'Despesa',
    icon: ArrowDownRight,
    sign: '−',
    color: 'text-expense',
    background: 'bg-expense/10',
  },
  investment: {
    label: 'Investimento',
    icon: Coins,
    sign: '−',
    color: 'text-investment',
    background: 'bg-investment/10',
  },
} satisfies Record<
  Transaction['type'],
  {
    label: string
    icon: typeof Coins
    sign: string
    color: string
    background: string
  }
>

export function formatTransactionAmount(
  type: Transaction['type'],
  amount: number,
) {
  return transactionPresentation[type].sign + formatMoney(amount)
}

export function transactionDateKey(value: unknown) {
  return format(parseFirestoreDate(value), 'yyyy-MM-dd')
}

export function formatTransactionDate(value: unknown, today: Date) {
  const date = parseFirestoreDate(value)
  const key = transactionDateKey(date)
  if (key === transactionDateKey(today)) return 'Hoje'
  if (key === transactionDateKey(subDays(today, 1))) return 'Ontem'
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}
