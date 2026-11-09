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
import { formatChartAmount, formatChartMonth } from './chart-format'

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
      <CardHeader className="px-4 py-4 min-[601px]:px-6">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Fluxo de Caixa
        </CardTitle>
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
              className="mb-4 flex flex-wrap gap-2"
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
                  className="hover:bg-accent focus-visible:ring-ring aria-pressed:bg-muted aria-pressed:text-foreground text-muted-foreground flex min-h-11 max-w-full min-w-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium [overflow-wrap:anywhere] whitespace-normal transition-colors outline-none focus-visible:ring-2 disabled:cursor-default"
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
            <div className="border-border bg-muted/60 rounded-lg border px-2 pt-3 min-[601px]:px-4">
              <p className="text-muted-foreground px-2 text-xs font-medium">
                Valores em R$
              </p>
              <div
                className="h-60 min-w-0 min-[601px]:h-72"
                aria-hidden="true"
                data-slot="cash-flow-plot"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={data}
                    accessibilityLayer={false}
                    barCategoryGap="21%"
                    barGap={4}
                    margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="monthLabel"
                      tickFormatter={(value: string) => formatChartMonth(value)}
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickMargin={12}
                      minTickGap={12}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      width={48}
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickCount={5}
                      tickFormatter={formatChartAmount}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--accent)' }}
                      content={
                        <GeistChartTooltip
                          valueFormatter={formatMoney}
                          monthLabel
                        />
                      }
                    />
                    {SERIES.map(
                      ({ key, label, color }) =>
                        visible[key] && (
                          <Bar
                            key={key}
                            dataKey={key}
                            name={label}
                            fill={color}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={32}
                            isAnimationActive={false}
                          />
                        ),
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <MonthlyChartData data={data} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
