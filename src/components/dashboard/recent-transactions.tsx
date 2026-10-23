'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentTransactions() {
  const { categories, error: categoriesError, refetch: refetchCategories } = useCategories()

  // Busca os lançamentos mais recentes
  const { transactions, isLoading, error, refetch } = useTransactions({ limitCount: 5 })

  const recent = transactions.slice(0, 5)

  // O(1) lookup em vez de categories.find() chamado N vezes no render
  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  if (error || categoriesError) return <LoadError error={error || categoriesError} retry={() => Promise.all([refetch(), refetchCategories()])} />

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="border-b border-border pb-6 flex flex-wrap flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-4 w-12" />
        </CardHeader>
        <CardContent className="space-y-4">
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
    <Card className="h-full">
      <CardHeader className="border-b border-border pb-6 flex flex-wrap flex-row items-center justify-between gap-4 space-y-0">
        <div className="min-w-0 space-y-0.5 [overflow-wrap:anywhere]">
          <CardTitle className="text-base font-medium text-foreground">Lançamentos Recentes</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">Últimas 5 movimentações</CardDescription>
        </div>
        <Link
          href="/transactions"
          className="flex min-h-10 min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-medium text-link hover:underline underline-offset-4"
        >
          Ver todos
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="">
        {recent.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação"
            description="Você ainda não registrou lançamentos financeiros nesta conta."
            icon={Wallet}
            compact
          />
        ) : (
          <div className="divide-y divide-border/60">
            {recent.map((tx) => <TransactionRow key={tx.id} transaction={tx} category={categoryMap.get(tx.categoryId)} />)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
