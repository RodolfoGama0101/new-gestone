'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
        <Card className="border-border bg-card shadow-xs rounded-md p-4 h-[102px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="size-5 rounded-md" />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4.5 w-10 rounded-full" />
          </div>
        </Card>
        <Card className="border-border bg-card shadow-xs rounded-md p-4 h-[102px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="size-5 rounded-md" />
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4.5 w-10 rounded-full" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
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
        <CardContent className="pb-4 px-5 space-y-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-green-700 dark:text-green-500">
              {formatBRL(income)}
            </span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                isIncomeTrendPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-1000/20 dark:text-green-500'
                  : 'bg-red-100 text-red-700 dark:bg-red-1000/20 dark:text-red-500'
              }`}
            >
              {isIncomeTrendPositive ? (
                <ArrowUpRight className="size-2.5" />
              ) : (
                <ArrowDownRight className="size-2.5" />
              )}
              {isIncomeTrendPositive ? '+' : ''}
              {incomeChange}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Em relação ao mês anterior</p>
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
        <CardContent className="pb-4 px-5 space-y-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-semibold tracking-tight text-red-700 dark:text-red-500">
              {formatBRL(expense)}
            </span>
            <span
              className={`flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                !isExpenseTrendPositive
                  ? 'bg-green-100 text-green-700 dark:bg-green-1000/20 dark:text-green-500'
                  : 'bg-red-100 text-red-700 dark:bg-red-1000/20 dark:text-red-500'
              }`}
            >
              {isExpenseTrendPositive ? (
                <ArrowUpRight className="size-2.5" />
              ) : (
                <ArrowDownRight className="size-2.5" />
              )}
              {isExpenseTrendPositive ? '+' : ''}
              {expenseChange}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Em relação ao mês anterior</p>
        </CardContent>
      </Card>
    </div>
  )
}
