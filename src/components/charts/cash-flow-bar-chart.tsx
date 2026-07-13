'use client'

import * as React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlySummary } from '@/lib/utils/analytics-helper'
import { GeistChartTooltip } from './geist-chart-tooltip'

interface CashFlowBarChartProps {
  data: MonthlySummary[]
}

export function CashFlowBarChart({ data }: CashFlowBarChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-sm transition-all duration-200 rounded-md">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Fluxo de Caixa</CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">Comparativo mensal de receitas vs despesas</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] pb-4 px-5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-medium">
            Sem dados históricos no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis 
                dataKey="monthLabel" 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="var(--muted-foreground)" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${(value / 100).toLocaleString('pt-BR', { notation: 'compact' })}`}
              />
              <Tooltip 
                content={
                  <GeistChartTooltip valueFormatter={formatBRL} />
                }
              />
              <Legend 
                verticalAlign="top" 
                height={28} 
                iconType="circle"
                iconSize={6}
                formatter={(value) => {
                  const label = value === 'income' ? 'Receitas' : 'Despesas'
                  return <span className="text-[10px] text-muted-foreground font-medium ml-1 mr-4">{label}</span>
                }}
              />
              <Bar dataKey="income" name="income" fill="var(--income)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" name="expense" fill="var(--expense)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
