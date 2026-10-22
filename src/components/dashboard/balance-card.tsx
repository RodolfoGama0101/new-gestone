'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
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
  referenceDate?: Date
}

export function BalanceCard({
  balance,
  changePercent,
  data,
  isLoading = false,
  futureCardExpenses = 0,
  availableBalance = balance,
  referenceDate,
}: BalanceCardProps) {
  const formattedBalance = formatMoney(balance)

  const isPositive = balance >= 0
  const changeLabel = Number.isFinite(changePercent)
    ? `${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. mês anterior`
    : 'Sem base anterior'

  if (isLoading) {
    return (
      <Card className="border-border bg-card flex h-[142px] flex-col justify-between rounded-md p-5 shadow-xs">
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
    <Card className="border-border bg-card overflow-hidden rounded-md shadow-xs transition-all duration-200 hover:shadow-sm">
      <CardHeader className="px-5 pt-4 pb-1">
        <CardTitle className="text-muted-foreground text-xs font-normal">
          Saldo projetado do mês
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-0">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-foreground break-all text-2xl sm:text-3xl font-semibold tracking-tight">
            {formattedBalance}
          </span>
        </div>
        <div className="mt-0.5 mb-2 flex min-h-[16px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground text-xs">
            {changeLabel}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Receitas menos despesas e investimentos do mês, incluindo a fatura
          deste mês.
        </p>
        <div className="text-muted-foreground mt-2 space-y-1 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span>Reserva para faturas após este mês:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatMoney(futureCardExpenses)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span>Disponível após reservas:</span>
            <span className="text-foreground font-semibold">
              {formatMoney(availableBalance)}
            </span>
          </div>
          <p>
            {referenceDate
              ? `Reservas de compras realizadas até ${referenceDate.toLocaleDateString('pt-BR')}.`
              : 'Reservas de compras realizadas para faturas dos próximos meses.'}{' '}
            Projeção dos lançamentos cadastrados.
          </p>
        </div>
      </CardContent>

      {/* Sparkline with minimalist line */}
      <div className="mt-2 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
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
