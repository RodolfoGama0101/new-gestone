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
      <Card className="flex min-h-80 flex-col justify-between p-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
      </Card>
    )
  }

  // Azul para a evolução positiva; o saldo negativo mantém a sinalização de despesa.
  const chartColor = isPositive ? 'var(--chart-1)' : 'var(--expense)'

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border pb-6">
        <CardTitle className="text-foreground text-base font-medium">
          Saldo projetado do mês
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-foreground break-all text-3xl sm:text-4xl font-medium tracking-tight tabular-nums">
            {formattedBalance}
          </span>
        </div>
        <div className="mt-0.5 mb-2 flex min-h-[16px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground text-sm">
            {changeLabel}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          Receitas menos despesas e investimentos do mês, incluindo a fatura
          deste mês.
        </p>
        <div className="text-muted-foreground mt-6 space-y-4 border-t border-border pt-6 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Reserva para faturas após este mês:</span>
            <span className="font-medium tabular-nums text-foreground">
              {formatMoney(futureCardExpenses)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Disponível após reservas:</span>
            <span className="text-foreground font-medium tabular-nums">
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

      {/* A curva usa os mesmos dados diários da projeção mensal. */}
      <div className="mx-6 h-40 min-w-0">
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
