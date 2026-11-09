'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { BudgetService } from '@/services/budget.service'
import type { AnalyticsDataService } from '@/services/analytics-data.service'
import type { Transaction } from '@/types/transaction'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import { reportComparison, reportTotals } from '@/lib/utils/financial-report'
import type { TransactionFilterValues } from '@/lib/utils/transaction-filters'
import { formatMoney } from '@/lib/utils/format-money'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { LoadError } from '@/components/shared/load-error'

type Report = Awaited<ReturnType<typeof AnalyticsDataService.getReport>>
type Detail = (overrides?: Partial<TransactionFilterValues>) => string
const percent = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const noBase = 'Sem base de comparação'

export function ReportIndicators({
  totals,
  previous,
  comparisonLoading,
  detail,
  selectedType,
}: {
  totals: Report['totals']
  previous?: Report['totals']
  comparisonLoading: boolean
  detail: Detail
  selectedType?: Transaction['type']
}) {
  const metrics = [
    { label: 'Receitas no período', key: 'income', type: 'income' },
    { label: 'Despesas no período', key: 'expense', type: 'expense' },
    {
      label: 'Investimentos no período',
      key: 'investment',
      type: 'investment',
    },
    { label: 'Resultado do período', key: 'result' },
    { label: 'Economia antes dos aportes', key: 'savings' },
  ] as const
  return (
    <div>
      <dl
        aria-label="Resumo do período"
        className="border-border bg-border grid min-w-0 gap-px overflow-hidden rounded-lg border min-[601px]:grid-cols-2 min-[1200px]:grid-cols-3"
      >
        {metrics.map((metric) => {
          const change = previous
            ? reportComparison(totals[metric.key], previous[metric.key])
            : null
          return (
            <div
              key={metric.key}
              className={`min-w-0 p-4 min-[601px]:p-5 ${metric.key === 'result' ? 'bg-chart-soft' : 'bg-card'}`}
            >
              <dt className="text-muted-foreground flex min-h-11 items-center text-sm font-medium">
                {'type' in metric &&
                selectedType &&
                selectedType !== metric.type ? (
                  metric.label
                ) : metric.key === 'savings' ? (
                  metric.label
                ) : (
                  <Link
                    className="text-link inline-block min-h-11 py-3 underline"
                    href={detail('type' in metric ? { type: metric.type } : {})}
                  >
                    {metric.label}
                  </Link>
                )}
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight [overflow-wrap:anywhere] tabular-nums min-[601px]:text-2xl">
                {formatMoney(totals[metric.key])}
              </dd>
              <dd className="text-muted-foreground mt-2 text-xs">
                {comparisonLoading
                  ? 'Carregando comparação…'
                  : !previous
                    ? 'Comparação indisponível'
                    : change === null
                      ? noBase
                      : `${percent(change)} em relação ao período anterior`}
                {previous && (
                  <span className="mt-1 block">
                    Anterior: {formatMoney(previous[metric.key])}
                  </span>
                )}
              </dd>
              {metric.key === 'savings' && (
                <dd className="flex flex-wrap gap-3 text-sm">
                  {(['income', 'expense'] as const)
                    .filter((type) => !selectedType || selectedType === type)
                    .map((type) => (
                      <Link
                        key={type}
                        className="text-link min-h-11 py-3 underline"
                        href={detail({ type })}
                      >
                        {type === 'income'
                          ? 'Ver receitas da economia'
                          : 'Ver despesas da economia'}
                      </Link>
                    ))}
                </dd>
              )}
            </div>
          )
        })}
        <div className="bg-card min-w-0 p-4 min-[601px]:p-5">
          <dt className="text-muted-foreground flex min-h-11 items-center text-sm font-medium">
            Percentual de aportes sobre receitas
          </dt>
          <dd className="mt-1 text-xl font-semibold tracking-tight tabular-nums">
            {totals.investmentRate === null
              ? noBase
              : percent(totals.investmentRate)}
          </dd>
          <dd className="text-muted-foreground mt-2 text-xs">
            Anterior:{' '}
            {comparisonLoading
              ? 'Carregando comparação…'
              : !previous
                ? 'Comparação indisponível'
                : previous.investmentRate == null
                  ? noBase
                  : percent(previous.investmentRate)}
          </dd>
          <dd>
            <Link
              className="text-link inline-block min-h-11 py-3 text-sm underline"
              href={detail()}
            >
              Ver base dos indicadores
            </Link>
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-3 text-xs">
        Resultado = receitas − despesas − aportes. Economia antes dos aportes =
        receitas − despesas. Os valores refletem o período e os filtros
        exibidos; não representam saldo bancário ou patrimônio.
      </p>
    </div>
  )
}

export function ReportDistributions({
  transactions,
  cards,
  detail,
  range,
}: {
  transactions: Transaction[]
  cards: Report['cards']
  detail: Detail
  range: string
}) {
  const { categories, error, isLoading, refetch } = useCategories()
  return (
    <section aria-label="Distribuições do período" className="space-y-6">
      {error ? (
        <LoadError error={error} retry={refetch} />
      ) : isLoading ? (
        <p role="status">Carregando categorias…</p>
      ) : (
        <div className="grid min-w-0 gap-6 min-[1200px]:grid-cols-2">
          {(['expense', 'income', 'investment'] as const).map((type) => {
            const shares = AnalyticsHelper.getCategoryShare(
              transactions,
              categories,
              type,
              true,
            )
            const total = reportTotals(transactions)[type]
            const topFive = shares
              .slice(0, 5)
              .reduce((sum, item) => sum + item.value, 0)
            return (
              <div key={type} className={`min-w-0 space-y-2 ${type === 'expense' ? 'col-span-full' : ''}`}>
                <CategoryDonutChart
                  data={shares}
                  type={type}
                  description={range}
                  categoryHref={(item) =>
                    detail({ type, categoryId: item.categoryId ?? '' })
                  }
                />
                <p className="text-muted-foreground text-sm">
                  Concentração das cinco maiores categorias:{' '}
                  {total ? percent((topFive / total) * 100) : noBase}. O ranking
                  inclui todas as categorias do conjunto filtrado.
                </p>
              </div>
            )
          })}
        </div>
      )}
      <section
        aria-label="Gastos por cartão"
        className="bg-card rounded-lg border p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold">Gastos por cartão</h2>
        <p className="mt-3 font-medium tabular-nums">
          Total em cartões:{' '}
          {formatMoney(cards.reduce((sum, card) => sum + card.amount, 0))}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {range} · despesas já incluídas nos totais; quitações não são outra
          despesa.
        </p>
        {cards.length === 0 ? (
          <p className="mt-4 text-sm">
            Sem gastos em cartões para estes critérios.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {cards.map((card) => (
              <li
                key={card.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <Link
                  className="text-link min-h-11 py-3 underline"
                  href={detail({ type: 'expense', creditCardId: card.id })}
                >
                  {card.name}
                </Link>
                <span className="tabular-nums">{formatMoney(card.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

function ReportMonthBudget({
  month,
  savings,
  transactions,
  partial,
}: {
  month: string
  savings: number
  transactions: Transaction[]
  partial: boolean
}) {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['budgets', user?.uid ?? '', month, 'report-settings'],
    queryFn: () => BudgetService.getSettings(user!.uid, month),
    enabled: !!user,
    staleTime: 60000,
  })
  return (
    <li className="space-y-3 py-4">
      <h3 className="font-medium">
        {month}
        {partial ? ' · mês parcial' : ''}
      </h3>
      {query.error ? (
        <LoadError error={query.error} retry={query.refetch} />
      ) : !query.data ? (
        <p role="status">Carregando metas…</p>
      ) : (
        <>
          <p className="text-sm">
            Economia nos critérios selecionados: {formatMoney(savings)}.{' '}
            {query.data.goal === undefined
              ? 'Meta não cadastrada para este mês.'
              : `Meta mensal: ${formatMoney(query.data.goal)} · ${savings >= query.data.goal ? 'Meta atingida' : 'Meta não atingida'}.`}
          </p>
          {query.data.limits.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Sem limites cadastrados neste mês.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {query.data.limits.map((limit) => {
                const actual = reportTotals(
                  transactions.filter(
                    (tx) => tx.categoryId === limit.categoryId,
                  ),
                ).expense
                return (
                  <li key={limit.categoryId}>
                    {limit.name} · Realizado: {formatMoney(actual)} · Limite
                    mensal: {formatMoney(limit.amount)} ·{' '}
                    {actual > limit.amount
                      ? `Excesso: ${formatMoney(actual - limit.amount)}`
                      : `Restante: ${formatMoney(limit.amount - actual)}`}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </li>
  )
}

export function ReportBudgets({
  monthly,
  transactions,
  start,
  end,
}: {
  monthly: Report['monthly']
  transactions: Transaction[]
  start: Date
  end: Date
}) {
  return (
    <section
      aria-label="Metas e limites por mês"
      className="bg-card rounded-lg border p-4 sm:p-6"
    >
      <h2 className="text-lg font-semibold">Metas e limites por mês</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Valores realizados seguem os filtros e o critério de data do relatório.
        Metas e limites são mensais, sem rateio; meses parciais não equivalem a
        um fechamento mensal.
      </p>
      <ul className="mt-4 divide-y">
        {monthly.map((item) => (
          <ReportMonthBudget
            key={item.month}
            month={item.month}
            savings={item.savings}
            transactions={transactions.filter((tx) =>
              item.transactionIds.includes(tx.id),
            )}
            partial={
              (item.month === format(start, 'yyyy-MM') &&
                start.getDate() !== 1) ||
              (item.month === format(end, 'yyyy-MM') &&
                end.getDate() !==
                  new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate())
            }
          />
        ))}
      </ul>
    </section>
  )
}
