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
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-lg font-bold">Gastos por Categoria</CardTitle>
        <CardDescription className="text-xs">Distribuição proporcional das despesas no período</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] pb-6 px-6">
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
                innerRadius={65}
                outerRadius={85}
                paddingAngle={2.5}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={formatTooltip} 
                contentStyle={{ 
                  backgroundColor: 'var(--popover)', 
                  borderColor: 'var(--border)', 
                  borderRadius: '12px',
                  color: 'var(--popover-foreground)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                }} 
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                formatter={(value: string) => {
                  const item = data.find((d) => d.name === value)
                  const valStr = item ? ` (${formatBRL(item.value)})` : ''
                  return <span className="text-xs text-foreground font-semibold">{value}{valStr}</span>
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
