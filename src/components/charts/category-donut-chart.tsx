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
import Link from 'next/link'

const COLORS = [
  'var(--chart-1)',
  'var(--chart-4)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-5)',
]

export function CategoryDonutChart({
  data,
  type = 'expense',
  description,
  categoryHref,
}: {
  data: CategoryShare[]
  type?: 'expense' | 'investment' | 'income'
  description?: string
  categoryHref?: (item: CategoryShare) => string
}) {
  const labels = {
    expense: {
      title: 'Gastos por categoria',
      list: 'Despesas por categoria',
      total: 'Total de despesas',
      empty: 'Sem dados de despesas no período selecionado.',
      description: 'Participação de cada categoria nas despesas do período.',
    },
    investment: {
      title: 'Distribuição dos aportes',
      list: 'Aportes por categoria',
      total: 'Total de aportes',
      empty: 'Sem aportes no período selecionado.',
      description: 'Participação de cada categoria nos aportes do período.',
    },
    income: {
      title: 'Distribuição das receitas',
      list: 'Receitas por categoria',
      total: 'Total de receitas',
      empty: 'Sem receitas no período selecionado.',
      description: 'Participação de cada categoria nas receitas do período.',
    },
  }[type]
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
      <CardHeader className="px-4 py-4 min-[601px]:px-6">
        <CardTitle className="text-lg font-semibold tracking-tight">
          {labels.title}
        </CardTitle>
        <CardDescription>{description ?? labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="@container p-4 min-[601px]:p-6">
        {data.length === 0 || total === 0 ? (
          <p className="text-muted-foreground text-sm">{labels.empty}</p>
        ) : (
          <div className="grid min-w-0 items-start gap-5 @min-[38rem]:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] @min-[38rem]:gap-7">
            <div className="bg-muted grid min-w-0 items-center gap-3 rounded-lg p-3 @min-[15rem]:grid-cols-[6rem_minmax(0,1fr)] @min-[24rem]:grid-cols-[8rem_minmax(0,1fr)] @min-[38rem]:grid-cols-1 @min-[38rem]:p-4">
              <div
                className="relative mx-auto aspect-square w-full max-w-32 @min-[38rem]:max-w-40"
                aria-hidden="true"
                data-slot="category-donut-plot"
              >
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart accessibilityLayer={false}>
                    <Pie
                      data={slices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="73%"
                      outerRadius="93%"
                      paddingAngle={2}
                      stroke="var(--muted)"
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
                  <span className="text-xl font-semibold tabular-nums">
                    {ranked.length}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {ranked.length === 1 ? 'categoria' : 'categorias'}
                  </span>
                </div>
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground text-xs">{labels.total}</p>
                <p className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere] tabular-nums @min-[38rem]:text-2xl">
                  {formatMoney(total)}
                </p>
                {ranked.length > 5 && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    A rosca destaca as 5 maiores categorias e reúne as demais em
                    “Outras categorias”.
                  </p>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div
                aria-hidden="true"
                className="border-border text-muted-foreground flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 text-xs font-medium"
              >
                <span>Categoria</span>
                <span>Valor e participação</span>
              </div>
              <ul aria-label={labels.list} className="divide-border divide-y">
                {ranked.map((item, index) => {
                  const ratio = item.value / total
                  return (
                    <li
                      key={item.categoryId ?? index}
                      className="py-3 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <div className="flex min-w-0 flex-[1_1_10rem] items-start gap-2 text-sm font-medium">
                          <span
                            className="border-foreground/20 mt-1 size-2.5 shrink-0 rounded-sm border"
                            style={{
                              backgroundColor:
                                COLORS[index] ?? 'var(--muted-foreground)',
                            }}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                            {categoryHref ? (
                              <Link
                                className="decoration-muted-foreground/50 hover:text-link underline underline-offset-4"
                                href={categoryHref(item)}
                              >
                                {item.name}
                              </Link>
                            ) : (
                              item.name
                            )}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 text-sm [overflow-wrap:anywhere] tabular-nums">
                          <span className="font-semibold">
                            {formatMoney(item.value)}
                          </span>
                          <span className="text-muted-foreground min-w-10 text-right text-xs">
                            {ratio.toLocaleString('pt-BR', {
                              style: 'percent',
                              maximumFractionDigits: 1,
                            })}
                          </span>
                        </div>
                      </div>
                      <div
                        className="bg-accent mt-2.5 h-2 overflow-hidden rounded-full"
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
