'use client'

import * as React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryShare } from '@/lib/utils/analytics-helper'
import { GeistChartTooltip } from './geist-chart-tooltip'

interface CategoryDonutChartProps {
  data: CategoryShare[]
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0)
  }, [data])

  return (
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-sm transition-all duration-200 rounded-md">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Gastos por Categoria</CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">Distribuição proporcional das despesas no período</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] pb-4 px-5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-medium">
            Sem dados de despesas no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={68}
                outerRadius={84}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                content={
                  <GeistChartTooltip valueFormatter={formatBRL} />
                }
              />
              <Legend 
                verticalAlign="bottom" 
                height={40} 
                iconType="circle"
                iconSize={5}
                formatter={(value: string) => {
                  const item = data.find((d) => d.name === value)
                  const percent = item && totalValue > 0 ? (item.value / totalValue) * 100 : 0
                  const percentStr = item ? ` (${percent.toFixed(0)}%)` : ''
                  const displayName = value.length > 10 ? `${value.substring(0, 10)}...` : value
                  return <span className="text-[10px] text-muted-foreground font-medium ml-1 mr-3" title={value}>{displayName}{percentStr}</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
