'use client'

import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatMoney } from '@/lib/utils/format-money'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { CategoryShare } from '@/lib/utils/analytics-helper'
import { GeistChartTooltip } from './geist-chart-tooltip'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-4)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-5)',
]

export function CategoryDonutChart({ data }: { data: CategoryShare[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const ranked = [...data].sort((a, b) => b.value - a.value)
  const slices = ranked
    .slice(0, 5)
    .map((item, index) => ({ ...item, fill: COLORS[index] }))
  if (ranked.length > 5)
    slices.push({
      name: 'Outras categorias',
      value: ranked.slice(5).reduce((sum, item) => sum + item.value, 0),
      color: '',
      fill: 'var(--muted-foreground)',
    })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por categoria</CardTitle>
        <CardDescription>
          Participação de cada categoria nas despesas do período.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {data.length === 0 || total === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem dados de despesas no período selecionado.
          </p>
        ) : (
          <>
            <div className="mb-6 grid items-center gap-4 sm:grid-cols-[200px_1fr] xl:grid-cols-1 2xl:grid-cols-[200px_1fr]">
              <div
                className="relative mx-auto h-48 w-full max-w-48"
                aria-hidden="true"
                data-slot="category-donut-plot"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart accessibilityLayer={false}>
                    <Pie
                      data={slices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="67%"
                      outerRadius="95%"
                      paddingAngle={2}
                      stroke="var(--card)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Tooltip
                      content={
                        <GeistChartTooltip valueFormatter={formatMoney} />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold tabular-nums">
                    {ranked.length}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {ranked.length === 1 ? 'categoria' : 'categorias'}
                  </span>
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <p className="text-muted-foreground text-xs">
                  Total de despesas
                </p>
                <p className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] tabular-nums">
                  {formatMoney(total)}
                </p>
                {ranked.length > 5 && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    A rosca destaca as 5 maiores categorias. As demais estão
                    agrupadas em “Outras categorias” e detalhadas abaixo.
                  </p>
                )}
              </div>
            </div>
            <ul
              aria-label="Despesas por categoria"
              className="divide-border divide-y"
            >
              {ranked.map((item, index) => {
                const ratio = item.value / total
                return (
                  <li key={index} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-2 text-sm">
                      <span
                        className="border-foreground/20 mt-1 size-2.5 shrink-0 rounded-sm border"
                        style={{
                          backgroundColor:
                            COLORS[index] ?? 'var(--muted-foreground)',
                        }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                        {item.name}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm tabular-nums">
                      <span className="font-medium">
                        {formatMoney(item.value)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {ratio.toLocaleString('pt-BR', {
                          style: 'percent',
                          maximumFractionDigits: 1,
                        })}
                      </span>
                    </div>
                    <div
                      className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${ratio * 100}%`,
                          backgroundColor:
                            COLORS[index] ?? 'var(--muted-foreground)',
                        }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
