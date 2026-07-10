'use client'

import * as React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlySummary } from '@/lib/utils/analytics-helper'

interface BalanceTrendAreaChartProps {
  data: MonthlySummary[]
}

export function BalanceTrendAreaChart({ data }: BalanceTrendAreaChartProps) {
  const formatBRL = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <Card className="shadow-xs border-border bg-card h-full hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-lg font-bold">Evolução de Saldo</CardTitle>
        <CardDescription className="text-xs">Tendência de acúmulo de saldo líquido mensal</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] pb-6 px-6">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-semibold">
            Sem dados de saldo no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis 
                dataKey="monthLabel" 
                stroke="var(--muted-foreground)" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="var(--muted-foreground)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$ ${(value / 100).toLocaleString('pt-BR', { notation: 'compact' })}`}
              />
              <Tooltip 
                formatter={(value: unknown) => {
                  const numVal = typeof value === 'number' ? value : Number(value)
                  return [formatBRL(isNaN(numVal) ? 0 : numVal), 'Saldo']
                }} 
                contentStyle={{ 
                  backgroundColor: 'var(--popover)', 
                  borderColor: 'var(--border)', 
                  borderRadius: '12px',
                  color: 'var(--popover-foreground)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="var(--primary)" 
                fillOpacity={1} 
                fill="url(#balanceColor)" 
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
