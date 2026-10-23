'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentTransactions() {
  const {
    categories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories()

  // Busca os lançamentos mais recentes
  const { transactions, isLoading, error, refetch } = useTransactions({
    limitCount: 5,
  })

  const recent = transactions.slice(0, 5)

  // O(1) lookup em vez de categories.find() chamado N vezes no render
  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  if (error || categoriesError)
    return (
      <LoadError
        error={error || categoriesError}
        retry={() => Promise.all([refetch(), refetchCategories()])}
      />
    )

  if (isLoading) {
    return (
      <Card className="border-border bg-card h-full rounded-xl shadow-xs">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-4 w-12" />
        </CardHeader>
        <CardContent className="space-y-3.5 px-5 pb-4">
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
    <Card className="border-border bg-card h-full rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 px-5 pt-4 pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-foreground text-sm font-semibold">
            Lançamentos Recentes
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs">
            Últimas 5 movimentações
          </CardDescription>
        </div>
        <Link
          href="/transactions"
          className="text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-0.5 text-xs font-medium transition-colors"
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
          <div className="divide-border/60 divide-y">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                category={categoryMap.get(tx.categoryId)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
