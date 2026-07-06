'use client'

import * as React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlySummary } from '@/lib/utils/analytics-helper'

interface CashFlowBarChartProps {
  data: MonthlySummary[]
}

export function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <Card className="shadow-sm border-border bg-card h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold">Fluxo de Caixa</CardTitle>
        <CardDescription>Comparativo mensal de receitas vs despesas</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pb-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-semibold">
            Sem dados históricos no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis 
                dataKey="monthLabel" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${(value / 100).toLocaleString('pt-BR', { notation: 'compact' })}`}
              />
              <Tooltip 
                formatter={(value: unknown) => {
                  const numVal = typeof value === 'number' ? value : Number(value)
                  return [formatBRL(isNaN(numVal) ? 0 : numVal)]
                }} 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  borderColor: 'hsl(var(--border))', 
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }} 
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                formatter={(value) => {
                  const label = value === 'income' ? 'Receitas' : 'Despesas'
                  return <span className="text-xs text-foreground font-semibold">{label}</span>
                }}
              />
              <Bar dataKey="income" name="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
