'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface DailyPoint {
  date: string
  balance: number
}

interface BalanceCardProps {
  balance: number // em centavos (ex: 1500 = R$ 15,00)
  changePercent: number
  data: DailyPoint[]
  isLoading?: boolean
  futureCardExpenses?: number
  availableBalance?: number
}

export function BalanceCard({
  balance,
  changePercent,
  data,
  isLoading = false,
  futureCardExpenses = 0,
  availableBalance = 0,
}: BalanceCardProps) {
  const formattedBalance = (balance / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const isPositive = balance >= 0
  const isTrendPositive = changePercent >= 0

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-xs rounded-md p-5 h-[142px] flex flex-col justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
      </Card>
    )
  }

  // Cor do Geist para a sparkline: azul Geist para saldo positivo, vermelho Geist para negativo
  const chartColor = isPositive ? 'var(--income)' : 'var(--expense)'

  return (
    <Card className="border-border bg-card overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
      <CardHeader className="pb-1 pt-4 px-5">
        <CardTitle className="text-xs font-normal text-muted-foreground">
          Saldo Líquido
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-0 px-5">
        <div className="flex items-baseline justify-between gap-4">
          <span
            className="text-3xl font-semibold tracking-tight text-foreground"
          >
            {formattedBalance}
          </span>
          <span
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              isTrendPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-1000/20 dark:text-green-500'
                : 'bg-red-100 text-red-700 dark:bg-red-1000/20 dark:text-red-500'
            }`}
          >
            {isTrendPositive ? (
              <TrendingUp className="size-3 shrink-0" />
            ) : (
              <TrendingDown className="size-3 shrink-0" />
            )}
            {isTrendPositive ? '+' : ''}
            {changePercent}%
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-0.5 mb-2">
          <p className="text-[10px] text-muted-foreground">Em relação ao mês anterior</p>
          {futureCardExpenses > 0 && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span>Faturas:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {(futureCardExpenses / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span>Disponível:</span>
              <span className="font-semibold text-foreground">
                {(availableBalance / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Sparkline with minimalist line */}
      <div className="h-12 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="balance"
              stroke={chartColor}
              strokeWidth={1.5}
              fill="url(#balanceGradient)"
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
