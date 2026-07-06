'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'

interface SummaryCardsProps {
  income: number // em centavos (ex: 1000 = R$ 10,00)
  incomeChange: number
  expense: number // em centavos
  expenseChange: number
  isLoading?: boolean
}

export function SummaryCards({
  income,
  incomeChange,
  expense,
  expenseChange,
  isLoading = false,
}: SummaryCardsProps) {
  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const isIncomeTrendPositive = incomeChange >= 0
  const isExpenseTrendPositive = expenseChange >= 0

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-sm border-border bg-card flex h-[110px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </Card>
        <Card className="shadow-sm border-border bg-card flex h-[110px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Card de Receitas */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Receitas Totais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-income">
              {formatBRL(income)}
            </span>
            <span className={`text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full shrink-0 ${
              isIncomeTrendPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
            }`}>
              {isIncomeTrendPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {isIncomeTrendPositive ? '+' : ''}{incomeChange}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            Em relação ao mês anterior
          </p>
        </CardContent>
      </Card>

      {/* Card de Despesas */}
      <Card className="shadow-sm border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Despesas Totais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-expense">
              {formatBRL(expense)}
            </span>
            <span className={`text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full shrink-0 ${
              !isExpenseTrendPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
            }`}>
              {isExpenseTrendPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {isExpenseTrendPositive ? '+' : ''}{expenseChange}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            Em relação ao mês anterior
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
