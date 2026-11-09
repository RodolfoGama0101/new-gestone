'use client'

import { useId } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
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

export function BalanceTrendAreaChart({ data }: { data: MonthlySummary[] }) {
  const gradientId = useId().replaceAll(':', '')
  const hasNegative = data.some((month) => month.balance < 0)
  return (
    <Card className="min-w-0">
      <CardHeader className="px-4 py-4 min-[601px]:px-6">
        <CardTitle className="text-lg font-semibold tracking-tight">
          Resultado acumulado do período
        </CardTitle>
        <CardDescription>
          O acumulado parte de zero no início do período.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem dados de saldo no período selecionado.
          </p>
        ) : (
          <>
            <div className="border-border bg-chart-soft/40 rounded-lg border px-2 pt-3 min-[601px]:px-4">
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-2 text-xs">
                <span className="font-medium">Valores em R$</span>
                <span className="flex items-center gap-2">
                  <span
                    className="bg-chart-1 h-0.5 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Receitas − despesas − investimentos
                </span>
              </div>
              <div
                className="h-56 min-w-0 min-[601px]:h-64"
                aria-hidden="true"
                data-slot="balance-trend-plot"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart
                    data={data}
                    accessibilityLayer={false}
                    margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--chart-1)"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
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
                      domain={['auto', 'auto']}
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickCount={5}
                      tickFormatter={formatChartAmount}
                    />
                    {hasNegative && (
                      <ReferenceLine
                        y={0}
                        ifOverflow="extendDomain"
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                      />
                    )}
                    <Tooltip
                      content={
                        <GeistChartTooltip
                          valueFormatter={formatMoney}
                          monthLabel
                        />
                      }
                    />
                    <Area
                      type="linear"
                      dataKey="balance"
                      name="Resultado acumulado do período"
                      stroke="var(--chart-1)"
                      fill={`url(#${gradientId})`}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'var(--card)', strokeWidth: 2 }}
                      activeDot={{
                        r: 5,
                        stroke: 'var(--card)',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Meses sem movimento mantêm o acumulado.
            </p>
            <MonthlyChartData data={data} balanceOnly />
          </>
        )}
      </CardContent>
    </Card>
  )
}
