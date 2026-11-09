'use client'

import type { MonthlySummary } from '@/lib/utils/analytics-helper'
import { formatMoney } from '@/lib/utils/format-money'
import { formatChartMonth } from './chart-format'

export function MonthlyChartData({
  data,
  balanceOnly = false,
}: {
  data: MonthlySummary[]
  balanceOnly?: boolean
}) {
  return (
    <details className="border-border @container mt-4 border-t pt-2 text-sm">
      <summary className="hover:bg-muted focus-visible:outline-ring min-h-11 cursor-pointer rounded-md px-2 py-3 font-medium focus-visible:outline-2">
        Ver dados por período
      </summary>
      <ul className="divide-border divide-y">
        {data.map((month, index) => (
          <li key={index} className="py-3">
            <p className="font-medium">
              {formatChartMonth(month.monthLabel, true)}
            </p>
            <dl className="mt-2 grid gap-2 @min-[30rem]:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
              {(balanceOnly
                ? ([['Resultado acumulado do período', month.balance]] as const)
                : ([
                    ['Receitas', month.income],
                    ['Despesas', month.expense],
                    ['Investimentos', month.investment],
                  ] as const)
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 @min-[30rem]:block"
                >
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="font-medium [overflow-wrap:anywhere] tabular-nums">
                    {formatMoney(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </details>
  )
}
