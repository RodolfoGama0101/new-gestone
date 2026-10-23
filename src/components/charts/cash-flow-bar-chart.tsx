'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MonthlySummary } from '@/lib/utils/analytics-helper'
import { MonthlyChartData } from './monthly-chart-data'
import { GeistChartTooltip } from './geist-chart-tooltip'

interface CashFlowBarChartProps {
  data: MonthlySummary[]
}

export function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const formatBRL = (value: number) => {
    return formatMoney(value)
  }

  return (
    <Card className="min-w-0 h-full">
      <CardHeader className="border-b border-border pb-6">
        <CardTitle className="text-base font-medium">Fluxo de Caixa</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Comparativo mensal de receitas vs despesas
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs font-medium">
            Sem dados históricos no período selecionado.
          </div>
        ) : (
          <>
            <p className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <span>Receitas</span>
              <span>Despesas</span>
              <span>Investimentos</span>
            </p>
            <div className="h-[280px]" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) =>
                      `R$ ${(value / 100).toLocaleString('pt-BR', { notation: 'compact' })}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)', opacity: 0.15 }}
                    content={<GeistChartTooltip valueFormatter={formatBRL} />}
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="var(--income)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="expense"
                    name="expense"
                    fill="var(--expense)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="investment"
                    name="investment"
                    fill="var(--chart-4)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <MonthlyChartData data={data} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
