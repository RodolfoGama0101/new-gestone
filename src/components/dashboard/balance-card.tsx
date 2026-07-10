'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'

interface DailyPoint {
  date: string
  balance: number
}

interface BalanceCardProps {
  balance: number // em centavos (ex: 1500 = R$ 15,00)
  changePercent: number
  data: DailyPoint[]
  isLoading?: boolean
}

export function BalanceCard({ balance, changePercent, data, isLoading = false }: BalanceCardProps) {
  const formattedBalance = (balance / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const isPositive = balance >= 0
  const isTrendPositive = changePercent >= 0

  if (isLoading) {
    return (
      <Card className="shadow-xs border-border bg-card flex h-[160px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Card>
    )
  }

  return (
    <Card className="shadow-xs border-border bg-card overflow-hidden hover:shadow-md transition-all duration-300">
      <CardHeader className="pb-3 pt-6 px-6">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Saldo Geral Líquido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-6 px-6">
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isPositive ? 'text-income' : 'text-expense'}`}>
            {formattedBalance}
          </span>
          <span className={`text-xs font-bold flex items-center gap-0.5 px-2.5 py-1 rounded-full shrink-0 ${
            isTrendPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
          }`}>
            {isTrendPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {isTrendPositive ? '+' : ''}{changePercent}%
          </span>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-14 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line
                type="monotone"
                dataKey="balance"
                stroke={isPositive ? 'var(--income)' : 'var(--expense)'}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
