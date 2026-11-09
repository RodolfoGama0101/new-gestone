'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils/format-money'
import { transactionPresentation } from '@/lib/utils/transaction-presentation'
import { workMonthHref } from '@/lib/utils/work-month'
import { useWorkMonth } from '@/providers/work-month-provider'
import { Skeleton } from '@/components/ui/skeleton'

export function formatDashboardChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'Sem base de comparação'
  return `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. mês anterior`
}

interface SummaryCardsProps {
  income: number
  incomeChange: number | null
  expense: number
  expenseChange: number | null
  investment: number
  investmentChange: number | null
  incomeCount?: number
  expenseCount?: number
  investmentCount?: number
  isLoading?: boolean
}

export function SummaryCards(props: SummaryCardsProps) {
  const { month } = useWorkMonth()
  const items = [
    {
      title: 'Receitas',
      amount: props.income,
      change: props.incomeChange,
      count: props.incomeCount ?? 0,
      path: '/income',
      icon: transactionPresentation.income.icon,
    },
    {
      title: 'Despesas',
      amount: props.expense,
      change: props.expenseChange,
      count: props.expenseCount ?? 0,
      path: '/expenses',
      icon: transactionPresentation.expense.icon,
    },
    {
      title: 'Aportes',
      amount: props.investment,
      change: props.investmentChange,
      count: props.investmentCount ?? 0,
      path: '/investments',
      icon: transactionPresentation.investment.icon,
    },
  ]
  return (
    <ul
      aria-label="Movimentações do mês"
      className="divide-border border-border grid min-w-0 divide-y rounded-lg border min-[601px]:grid-cols-3 min-[601px]:divide-x min-[601px]:divide-y-0"
    >
      {items.map((item) => (
        <li key={item.path} className="min-w-0 px-4 py-3">
          {props.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <Link
                href={workMonthHref(item.path, month)}
                className="group text-muted-foreground hover:text-link flex min-h-8 items-center gap-2 rounded-md text-sm font-medium transition-colors"
              >
                <item.icon aria-hidden="true" className="size-4 shrink-0" />
                {item.title}
                <ArrowRight
                  aria-hidden="true"
                  className="ml-auto size-3.5 shrink-0 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5"
                />
              </Link>
              <p className="mt-1 text-xl font-semibold tracking-tight [overflow-wrap:anywhere] tabular-nums">
                {formatMoney(item.amount)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {item.count} {item.count === 1 ? 'lançamento' : 'lançamentos'}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDashboardChange(item.change)}
              </p>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
