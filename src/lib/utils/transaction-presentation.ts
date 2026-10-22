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
    color: 'text-green-700 dark:text-green-400',
    background: 'bg-green-100 dark:bg-green-950',
  },
  expense: {
    label: 'Despesa',
    icon: ArrowDownRight,
    sign: '−',
    color: 'text-red-700 dark:text-red-400',
    background: 'bg-red-100 dark:bg-red-950',
  },
  investment: {
    label: 'Investimento',
    icon: Coins,
    sign: '−',
    color: 'text-violet-700 dark:text-violet-400',
    background: 'bg-violet-100 dark:bg-violet-950',
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
