import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import type { MonthlySummary } from './analytics-helper'
import type { TransactionFilterValues } from './transaction-filters'
import { getTransactionDate } from './transaction-date'
import { parseFirestoreDate } from './parse-date'

export function reportPeriod(reference: Date, months: number) {
  return {
    startDate: startOfMonth(subMonths(reference, months - 1)),
    endDate: endOfMonth(reference),
  }
}

export function previousReportPeriod(start: Date, end: Date, months?: number) {
  if (months) return reportPeriod(subMonths(end, months), months)
  const days = differenceInCalendarDays(end, start) + 1
  return {
    startDate: subDays(start, days),
    endDate: endOfDay(subDays(start, 1)),
  }
}

export function safeReportAdd(a: number, b: number) {
  const result = a + b
  if (
    !Number.isSafeInteger(a) ||
    !Number.isSafeInteger(b) ||
    !Number.isSafeInteger(result)
  )
    throw new RangeError('Total em centavos excede o limite seguro.')
  return result
}

export function reportTotals(transactions: Transaction[]) {
  const totals = { income: 0, expense: 0, investment: 0 }
  for (const tx of transactions)
    totals[tx.type] = safeReportAdd(totals[tx.type], tx.amount)
  const savings = safeReportAdd(totals.income, -totals.expense)
  return {
    ...totals,
    savings,
    result: safeReportAdd(savings, -totals.investment),
    investmentRate: totals.income
      ? (totals.investment / totals.income) * 100
      : null,
  }
}

export function reportComparison(current: number, previous: number) {
  return previous === 0
    ? null
    : ((current - previous) / Math.abs(previous)) * 100
}

export function reportMonthlyHistory(
  transactions: Transaction[],
  start: Date,
  end: Date,
  cards: CreditCard[],
  dateBasis: 'purchase' | 'competence',
) {
  const months = eachMonthOfInterval({ start, end })
  const groups = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const date =
      dateBasis === 'purchase'
        ? parseFirestoreDate(tx.date)
        : getTransactionDate(tx, cards)
    if (date < start || date > end) continue
    const key = format(date, 'yyyy-MM')
    const group = groups.get(key) ?? []
    group.push(tx)
    groups.set(key, group)
  }
  let accumulated = 0
  return months.map((date) => {
    const month = format(date, 'yyyy-MM')
    const totals = reportTotals(groups.get(month) ?? [])
    accumulated = safeReportAdd(accumulated, totals.result)
    return {
      month,
      monthLabel: format(date, 'MMM/yy', { locale: ptBR }),
      ...totals,
      balance: accumulated,
      transactionIds: (groups.get(month) ?? []).map((tx) => tx.id),
    } satisfies MonthlySummary & {
      month: string
      transactionIds: string[]
      savings: number
    }
  })
}

// Usa os critérios normalizados para manter o conjunto do indicador no extrato.
export function reportDetailHref(
  values: TransactionFilterValues,
  month: string,
  start: Date,
  end: Date,
  overrides: Partial<TransactionFilterValues> = {},
) {
  const params = new URLSearchParams()
  const detail = {
    ...values,
    ...overrides,
    month,
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
  for (const [key, value] of Object.entries(detail))
    if (value) params.set(key, value)
  return `/transactions?${params}`
}
