import type { MonthlySummary } from '@/lib/utils/analytics-helper'
import { formatMoney } from '@/lib/utils/format-money'
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from 'lucide-react'

export function ReportSummary({ data }: { data: MonthlySummary[] }) {
  const totals = data.reduce(
    (sum, month) => ({
      income: sum.income + month.income,
      expense: sum.expense + month.expense,
      investment: sum.investment + month.investment,
    }),
    { income: 0, expense: 0, investment: 0 },
  )
  const metrics = [
    {
      label: 'Receitas no período',
      value: totals.income,
      icon: ArrowDownLeft,
      color: 'text-income',
    },
    {
      label: 'Despesas no período',
      value: totals.expense,
      icon: ArrowUpRight,
      color: 'text-expense',
    },
    {
      label: 'Investimentos no período',
      value: totals.investment,
      icon: Landmark,
      color: 'text-chart-1',
    },
    {
      label: 'Resultado do período',
      value: data.at(-1)?.balance ?? 0,
      icon: Wallet,
      color: 'text-foreground',
    },
  ]
  return (
    <div>
      <dl
        aria-label="Resumo do período"
        className="grid min-w-0 grid-cols-1 gap-3 min-[300px]:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card min-w-0 rounded-lg border p-3 sm:p-5"
          >
            <dt className="text-muted-foreground flex items-start justify-between gap-3 text-xs">
              {label}
              <Icon className={`size-4 shrink-0 ${color}`} aria-hidden="true" />
            </dt>
            <dd className="mt-3 text-lg font-semibold tracking-tight [overflow-wrap:anywhere] tabular-nums sm:text-2xl">
              {formatMoney(value).replace('\u00a0', ' ')}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground mt-3 text-xs">
        Resultado = receitas − despesas − investimentos. Os valores seguem a
        competência dos lançamentos.
      </p>
    </div>
  )
}
