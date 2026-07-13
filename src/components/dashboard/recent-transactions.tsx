'use client'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CategoryBadge } from '@/components/shared/category-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentTransactions() {
  const { categories } = useCategories()

  // Busca os lançamentos mais recentes
  const { transactions, isLoading } = useTransactions({ limitCount: 5 })

  const recent = transactions.slice(0, 5)

  const getCategoryDetails = (catId: string) => {
    return categories.find((c) => c.id === catId)
  }

  const formatDate = (dateVal: unknown): string => {
    if (!dateVal) return ''
    let d: Date
    if (dateVal instanceof Date) {
      d = dateVal
    } else if (dateVal instanceof Timestamp) {
      d = dateVal.toDate()
    } else {
      const record = dateVal as { seconds?: number }
      if (record && typeof record.seconds === 'number') {
        d = new Date(record.seconds * 1000)
      } else {
        d = new Date(dateVal as string | number)
      }
    }
    return format(d, 'dd/MM')
  }

  if (isLoading) {
    return (
      <Card className="border-border bg-card h-full shadow-xs rounded-md">
        <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-4 w-12" />
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3.5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-0.5">
              <Skeleton className="size-7 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <Skeleton className="h-4.5 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card h-full shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-semibold text-foreground">Lançamentos Recentes</CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground">Últimas 5 movimentações</CardDescription>
        </div>
        <Link
          href="/transactions"
          className="flex items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="px-5 pb-4">
        {recent.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação"
            description="Você ainda não registrou lançamentos financeiros nesta conta."
            icon={Wallet}
            compact
          />
        ) : (
          <div className="divide-y divide-border/60">
            {recent.map((tx) => {
              const cat = getCategoryDetails(tx.categoryId)
              const isIncome = tx.type === 'income'
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 transition-colors cursor-default"
                >
                  {/* Icon compact squared 28px */}
                  <div
                    className={`size-7 rounded-md flex items-center justify-center shrink-0 border ${
                      isIncome
                        ? 'bg-green-100 text-green-700 border-green-200/40 dark:bg-green-1000/20 dark:text-green-500 dark:border-green-800/10'
                        : 'bg-red-100 text-red-700 border-red-200/40 dark:bg-red-1000/20 dark:text-red-500 dark:border-red-800/10'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                  </div>

                  {/* Description + Meta */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate text-foreground leading-tight">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{formatDate(tx.date)}</span>
                      {cat && <CategoryBadge name={cat.name} color={cat.color} />}
                    </div>
                  </div>

                  {/* Amount */}
                  <span
                    className={`text-xs font-semibold shrink-0 tabular-nums ${
                      isIncome ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'
                    }`}
                  >
                    {isIncome ? '+' : '−'}
                    {(tx.amount / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
