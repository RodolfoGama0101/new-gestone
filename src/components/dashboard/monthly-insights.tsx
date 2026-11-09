'use client'

import Link from 'next/link'
import { useBudget } from '@/hooks/use-budget'
import { useCategories } from '@/hooks/use-categories'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'
import { formatMoney } from '@/lib/utils/format-money'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import type { PeriodSummary } from '@/services/analytics.service'
import type { Transaction } from '@/types/transaction'
import { ArrowRight } from 'lucide-react'
import { LoadError } from '@/components/shared/load-error'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'

export function MonthlyGoal() {
  const { month } = useWorkMonth()
  const budget = useBudget(month)
  const goal = budget.data?.goal
  const savings = budget.data?.savings ?? 0
  return (
    <section className="min-w-0 space-y-3 p-4 text-sm [overflow-wrap:anywhere] min-[601px]:p-5">
      <h2 className="font-medium">Meta de economia do mês</h2>
      {budget.error ? (
        <LoadError error={budget.error} retry={budget.refetch} />
      ) : budget.isPending ? (
        <p role="status">Carregando meta…</p>
      ) : goal === undefined ? (
        <p>Meta não cadastrada para este mês.</p>
      ) : (
        <>
          <div className="tabular-nums">
            <p className="text-xl font-semibold tracking-tight">
              {formatMoney(savings)}
            </p>
            <p className="text-muted-foreground text-xs">
              Meta de {formatMoney(goal)}
            </p>
          </div>
          <progress
            className="bg-accent [&::-moz-progress-bar]:bg-link [&::-webkit-progress-bar]:bg-accent [&::-webkit-progress-value]:bg-link h-2 w-full appearance-none overflow-hidden rounded-full"
            max={goal}
            value={Math.max(0, Math.min(savings, goal))}
            aria-label="Progresso da meta de economia"
            aria-valuetext={`${formatMoney(savings)} de ${formatMoney(goal)}`}
          />
          <p className="text-muted-foreground text-xs">
            {savings >= goal
              ? 'Meta atingida'
              : `Faltam ${formatMoney(goal - savings)} para a meta.`}
          </p>
        </>
      )}
      <p className="text-muted-foreground text-xs">
        Economia = receitas − despesas. Inclui os aportes.
      </p>
      <Link
        className="text-link inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline"
        href={workMonthHref('/budgets', month)}
      >
        Ver orçamentos e metas
        <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    </section>
  )
}

export function MonthlyExpenseCategories({
  summary,
}: {
  summary: PeriodSummary & { currentTransactions: Transaction[] }
}) {
  const { month } = useWorkMonth()
  const { categories, isLoading, error, refetch } = useCategories()
  if (error) return <LoadError error={error} retry={refetch} />
  if (isLoading) return <p role="status">Carregando categorias…</p>
  return (
    <CategoryDonutChart
      data={AnalyticsHelper.getCategoryShare(
        summary.currentTransactions,
        categories,
        'expense',
        true,
      )}
      description={`Maiores despesas por categoria · ${month} · competência. Inclui as faturas do mês.`}
      categoryHref={(item) =>
        workMonthHref(
          `/expenses?categoryId=${encodeURIComponent(item.categoryId ?? '')}`,
          month,
        )
      }
    />
  )
}

export function MonthlyFlow({ summary }: { summary: PeriodSummary }) {
  const { month } = useWorkMonth()
  return (
    <CashFlowBarChart
      data={[
        {
          monthLabel: month,
          income: summary.income,
          expense: summary.expense,
          investment: summary.investment,
          balance: summary.balance,
        },
      ]}
    />
  )
}
