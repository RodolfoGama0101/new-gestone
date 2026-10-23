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

export function BalanceTrendAreaChart({ data }: { data: MonthlySummary[] }) {
  const gradientId = useId().replaceAll(':', '')
  const hasNegative = data.some((month) => month.balance < 0)
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Evolução de Saldo</CardTitle>
        <CardDescription>
          Acumulado a partir de zero no início do período; não representa o
          saldo bancário.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-4 sm:p-6">
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem dados de saldo no período selecionado.
          </p>
        ) : (
          <>
            <div className="text-muted-foreground mb-4 flex items-center gap-2 text-xs">
              <span className="bg-chart-1 h-0.5 w-5" aria-hidden="true" />
              Receitas − despesas − investimentos
            </div>
            <div
              className="h-64 min-w-0 sm:h-72"
              aria-hidden="true"
              data-slot="balance-trend-plot"
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                  data={data}
                  accessibilityLayer={false}
                  margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
                    minTickGap={24}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    width={52}
                    domain={['auto', 'auto']}
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
                  {hasNegative && (
                    <ReferenceLine
                      y={0}
                      ifOverflow="extendDomain"
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Tooltip
                    content={<GeistChartTooltip valueFormatter={formatMoney} />}
                  />
                  <Area
                    type="linear"
                    dataKey="balance"
                    name="Saldo acumulado"
                    stroke="var(--chart-1)"
                    fill={`url(#${gradientId})`}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: 'var(--card)', strokeWidth: 2 }}
                    activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Valores em R$ · meses sem movimento mantêm o acumulado.
            </p>
            <MonthlyChartData data={data} balanceOnly />
          </>
        )}
      </CardContent>
    </Card>
  )
}
