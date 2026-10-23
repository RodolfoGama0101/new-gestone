'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Check, Minus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { MonthlySummary } from '@/lib/utils/analytics-helper'
import { formatMoney } from '@/lib/utils/format-money'
import { MonthlyChartData } from './monthly-chart-data'
import { GeistChartTooltip } from './geist-chart-tooltip'

const SERIES = [
  { key: 'income', label: 'Receitas', color: 'var(--income)' },
  { key: 'expense', label: 'Despesas', color: 'var(--expense)' },
  { key: 'investment', label: 'Investimentos', color: 'var(--chart-1)' },
] as const

export function CashFlowBarChart({ data }: { data: MonthlySummary[] }) {
  const [visible, setVisible] = useState({
    income: true,
    expense: true,
    investment: true,
  })
  const visibleCount = Object.values(visible).filter(Boolean).length
  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <CardTitle>Fluxo de Caixa</CardTitle>
        <CardDescription>
          Receitas, despesas e investimentos, mês a mês.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem dados históricos no período selecionado.
          </p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Séries do fluxo de caixa"
              className="mb-6 flex flex-wrap gap-2"
            >
              {SERIES.map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={visible[key]}
                  disabled={visibleCount === 1 && visible[key]}
                  onClick={() =>
                    setVisible((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }
                  className="hover:bg-muted focus-visible:ring-ring aria-pressed:border-foreground/30 aria-pressed:bg-muted flex min-h-10 max-w-full min-w-0 items-center gap-2 rounded-md border px-3 text-left text-xs font-medium [overflow-wrap:anywhere] whitespace-normal transition-colors outline-none focus-visible:ring-2 disabled:cursor-default"
                >
                  <span
                    className="flex size-4 items-center justify-center rounded-sm border"
                    style={{
                      backgroundColor: visible[key] ? color : 'transparent',
                      borderColor: color,
                    }}
                    aria-hidden="true"
                  >
                    {visible[key] ? (
                      <Check className="size-3 text-white dark:text-black" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
            <div
              className="h-72 min-w-0 sm:h-80"
              aria-hidden="true"
              data-slot="cash-flow-plot"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={data}
                  accessibilityLayer={false}
                  barCategoryGap="24%"
                  barGap={3}
                  margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                  />
                  <XAxis
                    dataKey="monthLabel"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickMargin={12}
                    minTickGap={18}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={52}
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickCount={5}
                    tickFormatter={(value: number) =>
                      (value / 100).toLocaleString('pt-BR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      })
                    }
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.7 }}
                    content={<GeistChartTooltip valueFormatter={formatMoney} />}
                  />
                  {SERIES.map(
                    ({ key, label, color }) =>
                      visible[key] && (
                        <Bar
                          key={key}
                          dataKey={key}
                          name={label}
                          fill={color}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                          isAnimationActive={false}
                        />
                      ),
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Valores em R$. Selecione as séries acima para comparar.
            </p>
            <MonthlyChartData data={data} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
