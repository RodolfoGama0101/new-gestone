'use client'

import * as React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlySummary } from '@/lib/utils/analytics-helper'
import { GeistChartTooltip } from './geist-chart-tooltip'

interface BalanceTrendAreaChartProps {
  data: MonthlySummary[]
}

export function BalanceTrendAreaChart({ data }: BalanceTrendAreaChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Cor principal: azul Geist para saldo/evolução
  const chartColor = 'var(--chart-1)'

  return (
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-sm transition-all duration-200 rounded-md">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold">Evolução de Saldo</CardTitle>
        <CardDescription className="text-[10px] text-muted-foreground">Tendência de acúmulo de saldo líquido mensal</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px] pb-4 px-5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-medium">
            Sem dados de saldo no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
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
              <Area 
                type="monotone" 
                dataKey="balance" 
                name="Saldo"
                stroke={chartColor} 
                fillOpacity={1} 
                fill="url(#balanceColor)" 
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
