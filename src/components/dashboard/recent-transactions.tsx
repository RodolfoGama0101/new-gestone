'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import type { Transaction } from '@/types/transaction'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { Wallet, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthHref } from '@/lib/utils/work-month'

export function RecentTransactions({
  transactions,
  isLoading = false,
}: {
  transactions: Transaction[]
  isLoading?: boolean
}) {
  const { month } = useWorkMonth()
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories()

  const recent = transactions.slice(0, 5)

  // O(1) lookup em vez de categories.find() chamado N vezes no render
  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  if (categoriesError)
    return <LoadError error={categoriesError} retry={refetchCategories} />

  if (isLoading || categoriesLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="border-border flex flex-row flex-wrap items-center justify-between gap-4 border-b pb-6">
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
      <CardHeader className="border-border flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 border-b pb-6">
        <div className="min-w-0 space-y-0.5 [overflow-wrap:anywhere]">
          <CardTitle className="text-foreground text-base font-medium">
            Lançamentos recentes
          </CardTitle>
        </div>
        <Link
          href={workMonthHref('/transactions', month)}
          className="text-link flex min-h-10 max-w-full min-w-0 flex-wrap items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          Ver extrato
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {recent.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação"
            description="Nenhum lançamento na competência selecionada."
            icon={Wallet}
            compact
          />
        ) : (
          <TransactionTable
            transactions={recent}
            categoryMap={categoryMap}
            showDate
          />
        )}
      </CardContent>
    </Card>
  )
}
