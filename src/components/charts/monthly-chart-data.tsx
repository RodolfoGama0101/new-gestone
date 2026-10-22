'use client'

import type { MonthlySummary } from '@/lib/utils/analytics-helper'
import { formatMoney } from '@/lib/utils/format-money'

export function MonthlyChartData({
  data,
  balanceOnly = false,
}: {
  data: MonthlySummary[]
  balanceOnly?: boolean
}) {
  return (
    <details className="mt-4 text-sm">
      <summary className="focus-visible:outline-ring min-h-11 cursor-pointer rounded-md py-3 font-medium focus-visible:outline-2">
        Ver dados por período
      </summary>
      <ul className="divide-border divide-y">
        {data.map((month, index) => (
          <li key={index} className="py-3">
            <h4 className="font-medium">{month.monthLabel}</h4>
            <dl className="mt-2 grid gap-2">
              {(balanceOnly
                ? ([['Saldo acumulado', month.balance]] as const)
                : ([
                    ['Receitas', month.income],
                    ['Despesas', month.expense],
                    ['Investimentos', month.investment],
                  ] as const)
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-wrap justify-between gap-x-4 gap-y-1"
                >
                  <dt>{label}</dt>
                  <dd className="font-mono break-all tabular-nums">
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
