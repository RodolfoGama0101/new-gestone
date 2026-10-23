'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpCircle, ArrowDownCircle, Coins } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SummaryCardsProps {
  income: number // em centavos (ex: 1000 = R$ 10,00)
  incomeChange: number
  expense: number // em centavos
  expenseChange: number
  investment: number // em centavos (NOVO)
  investmentChange: number // (NOVO)
  incomeCount?: number
  expenseCount?: number
  investmentCount?: number
  isLoading?: boolean
}

export function SummaryCards({
  income,
  incomeChange,
  expense,
  expenseChange,
  investment,
  investmentChange,
  incomeCount = 0,
  expenseCount = 0,
  investmentCount = 0,
  isLoading = false,
}: SummaryCardsProps) {
  const formatBRL = (cents: number) => {
    return formatMoney(cents)
  }

  const formatChange = (value: number) => {
    if (!Number.isFinite(value)) return 'Sem base anterior'
    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% vs. mês anterior`
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="border-border bg-card flex h-[102px] flex-col justify-between rounded-xl p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="size-5 rounded-md" />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4.5 w-10 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {/* Income Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-1">
          <CardTitle className="text-muted-foreground text-xs font-normal">
            Receitas
          </CardTitle>
          <div className="bg-income/10 border-border flex size-6 items-center justify-center rounded-md border">
            <ArrowUpCircle className="text-income size-3.5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <span className="text-income text-xl font-semibold tracking-tight break-words tabular-nums sm:text-2xl">
            {formatBRL(income)}
          </span>
          <p className="text-muted-foreground mt-1 text-xs">
            {incomeCount} {incomeCount === 1 ? 'recebimento' : 'recebimentos'} ·{' '}
            {formatChange(incomeChange)}
          </p>
        </CardContent>
      </Card>

      {/* Expense Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-1">
          <CardTitle className="text-muted-foreground text-xs font-normal">
            Despesas
          </CardTitle>
          <div className="bg-expense/10 border-border flex size-6 items-center justify-center rounded-md border">
            <ArrowDownCircle className="text-expense size-3.5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <span className="text-expense text-xl font-semibold tracking-tight break-words tabular-nums sm:text-2xl">
            {formatBRL(expense)}
          </span>
          <p className="text-muted-foreground mt-1 text-xs">
            {expenseCount} {expenseCount === 1 ? 'pagamento' : 'pagamentos'} ·{' '}
            {formatChange(expenseChange)}
          </p>
        </CardContent>
      </Card>

      {/* Investment Card */}
      <Card className="border-border bg-card rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-4 pb-1">
          <CardTitle className="text-muted-foreground text-xs font-normal">
            Investimentos
          </CardTitle>
          <div className="bg-investment/10 border-border flex size-6 items-center justify-center rounded-md border">
            <Coins className="text-investment size-3.5" />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <span className="text-investment text-xl font-semibold tracking-tight break-words tabular-nums sm:text-2xl">
            {formatBRL(investment)}
          </span>
          <p className="text-muted-foreground mt-1 text-xs">
            {investmentCount} {investmentCount === 1 ? 'aporte' : 'aportes'} ·{' '}
            {formatChange(investmentChange)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
