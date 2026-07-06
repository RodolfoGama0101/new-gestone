'use client'

import * as React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryShare } from '@/lib/utils/analytics-helper'

interface CategoryDonutChartProps {
  data: CategoryShare[]
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatTooltip = (value: unknown) => {
    const numVal = typeof value === 'number' ? value : Number(value)
    return [formatBRL(isNaN(numVal) ? 0 : numVal), 'Total']
  }

  return (
    <Card className="shadow-sm border-border bg-card h-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Gastos por Categoria</CardTitle>
        <CardDescription>Distribuição proporcional das despesas no período</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-semibold">
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
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={formatTooltip} 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  borderColor: 'hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(value: string) => {
                  const item = data.find((d) => d.name === value)
                  const valStr = item ? ` (${formatBRL(item.value)})` : ''
                  return <span className="text-xs text-foreground font-medium">{value}{valStr}</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
