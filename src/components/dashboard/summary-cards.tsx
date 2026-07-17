'use client'

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
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border bg-card shadow-xs rounded-md p-4 h-[102px] flex flex-col justify-between">
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
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Income Card */}
      <Card className="border-border bg-card shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
        <CardHeader className="pb-1 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            Receitas
          </CardTitle>
          <div className="size-6 rounded-md bg-green-100 dark:bg-green-1000/20 flex items-center justify-center border border-green-200/50 dark:border-green-800/20">
            <ArrowUpCircle className="size-3.5 text-green-700 dark:text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-green-700 dark:text-green-500">
            {formatBRL(income)}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">
            {incomeCount} {incomeCount === 1 ? 'recebimento' : 'recebimentos'}
          </p>
        </CardContent>
      </Card>
 
      {/* Expense Card */}
      <Card className="border-border bg-card shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
        <CardHeader className="pb-1 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            Despesas
          </CardTitle>
          <div className="size-6 rounded-md bg-red-100 dark:bg-red-1000/20 flex items-center justify-center border border-red-200/50 dark:border-red-800/20">
            <ArrowDownCircle className="size-3.5 text-red-700 dark:text-red-500" />
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-red-700 dark:text-red-500">
            {formatBRL(expense)}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">
            {expenseCount} {expenseCount === 1 ? 'pagamento' : 'pagamentos'}
          </p>
        </CardContent>
      </Card>
 
      {/* Investment Card */}
      <Card className="border-border bg-card shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
        <CardHeader className="pb-1 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs font-normal text-muted-foreground">
            Investimentos
          </CardTitle>
          <div className="size-6 rounded-md bg-violet-100 dark:bg-violet-1000/20 flex items-center justify-center border border-violet-200/50 dark:border-violet-800/20">
            <Coins className="size-3.5 text-violet-700 dark:text-violet-500" />
          </div>
        </CardHeader>
        <CardContent className="pb-4 px-5">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight text-violet-700 dark:text-violet-500">
            {formatBRL(investment)}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">
            {investmentCount} {investmentCount === 1 ? 'aporte' : 'aportes'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
