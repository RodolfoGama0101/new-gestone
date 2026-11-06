'use client'

import Link from 'next/link'
import { formatMoney } from '@/lib/utils/format-money'
import { workMonthHref } from '@/lib/utils/work-month'
import { useWorkMonth } from '@/providers/work-month-provider'
import { Card } from '@/components/ui/card'
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
      color: 'text-income',
    },
    {
      title: 'Despesas',
      amount: props.expense,
      change: props.expenseChange,
      count: props.expenseCount ?? 0,
      path: '/expenses',
      color: 'text-expense',
    },
    {
      title: 'Aportes',
      amount: props.investment,
      change: props.investmentChange,
      count: props.investmentCount ?? 0,
      path: '/investments',
      color: 'text-foreground',
    },
  ]
  return (
    <div className="grid gap-4 min-[1100px]:grid-cols-3">
      {items.map((item) => (
        <Card key={item.path} className="min-w-0 gap-0 p-5 sm:p-6">
          {props.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <Link
                href={workMonthHref(item.path, month)}
                className="text-muted-foreground focus-visible:outline-ring w-fit py-1 text-sm underline-offset-4 hover:underline"
              >
                {item.title}
              </Link>
              <p
                className={`mt-2 text-2xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums ${item.color}`}
              >
                {formatMoney(item.amount)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {item.count} {item.count === 1 ? 'lançamento' : 'lançamentos'} ·{' '}
                {formatDashboardChange(item.change)}
              </p>
            </>
          )}
        </Card>
      ))}
    </div>
  )
}
