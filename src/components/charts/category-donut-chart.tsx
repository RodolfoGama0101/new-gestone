'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CategoryShare } from '@/lib/utils/analytics-helper'
import { GeistChartTooltip } from './geist-chart-tooltip'

interface CategoryDonutChartProps {
  data: CategoryShare[]
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const formatBRL = (value: number) => {
    return formatMoney(value)
  }

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0)
  }, [data])

  return (
    <Card className="border-border bg-card h-full rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
      <CardHeader className="px-5 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">
          Gastos por Categoria
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Distribuição proporcional das despesas no período
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 px-5 pb-4">
        {data.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-xs font-medium">
            Sem dados de despesas no período selecionado.
          </div>
        ) : (
          <>
            <div className="h-[240px]" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius="55%"
                    outerRadius="75%"
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<GeistChartTooltip valueFormatter={formatBRL} />}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="mb-3 text-sm font-medium">
              Total: {formatBRL(totalValue)}
            </p>
            <ul
              aria-label="Despesas por categoria"
              className="divide-border divide-y text-sm"
            >
              {data.map((entry, index) => (
                <li key={index} className="py-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className="border-foreground mt-1 size-3 shrink-0 rounded-sm border"
                      style={{ backgroundColor: entry.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 font-medium [overflow-wrap:anywhere] break-words">
                      {entry.name}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap justify-between gap-2 pl-5">
                    <span className="break-all tabular-nums">
                      {formatBRL(entry.value)}
                    </span>
                    <span>
                      {(totalValue > 0
                        ? entry.value / totalValue
                        : 0
                      ).toLocaleString('pt-BR', {
                        style: 'percent',
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
