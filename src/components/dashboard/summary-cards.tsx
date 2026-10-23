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
          <Card key={i} className="min-h-36 justify-between p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="size-5 rounded-md" />
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2">
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
      <Card className="gap-4">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="min-w-0 text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">
            Receitas
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
            <ArrowUpCircle className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <span className="break-all text-2xl font-medium tracking-tight tabular-nums text-foreground">
            {formatBRL(income)}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {incomeCount} {incomeCount === 1 ? 'recebimento' : 'recebimentos'} · {formatChange(incomeChange)}
          </p>
        </CardContent>
      </Card>
 
      {/* Expense Card */}
      <Card className="gap-4">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="min-w-0 text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">
            Despesas
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
            <ArrowDownCircle className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <span className="break-all text-2xl font-medium tracking-tight tabular-nums text-foreground">
            {formatBRL(expense)}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {expenseCount} {expenseCount === 1 ? 'pagamento' : 'pagamentos'} · {formatChange(expenseChange)}
          </p>
        </CardContent>
      </Card>
 
      {/* Investment Card */}
      <Card className="gap-4">
        <CardHeader className="flex min-w-0 flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="min-w-0 text-sm font-normal text-muted-foreground [overflow-wrap:anywhere]">
            Investimentos
          </CardTitle>
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-muted">
            <Coins className="size-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <span className="break-all text-2xl font-medium tracking-tight tabular-nums text-foreground">
            {formatBRL(investment)}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">
            {investmentCount} {investmentCount === 1 ? 'aporte' : 'aportes'} · {formatChange(investmentChange)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
