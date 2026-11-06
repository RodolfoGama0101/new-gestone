'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import {
  TransactionService,
  type GetTransactionsFilters,
} from '@/services/transaction.service'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { LoadError } from '@/components/shared/load-error'

type Criteria = Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'>

export function TransactionDistribution({
  criteria,
  valid,
  type,
}: {
  criteria: Criteria
  valid: boolean
  type: 'income' | 'investment'
}) {
  const { user } = useAuth()
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories()
  const search = normalizeTransactionSearch(criteria.search ?? '')
  const [settledSearch, setSettledSearch] = React.useState(search)
  React.useEffect(() => {
    const timeout = setTimeout(() => setSettledSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])
  const filters = { ...criteria, type, search }
  const query = useQuery({
    queryKey: ['transactionDistribution', user?.uid, filters],
    queryFn: async ({ signal }) => {
      const transactions = await TransactionService.getAll(user!.uid, filters, {
        signal,
      })
      // Rejeita totais inseguros antes de apresentar qualquer valor parcial.
      transactions.reduce((sum, tx) => {
        const total = sum + tx.amount
        if (!Number.isSafeInteger(tx.amount) || !Number.isSafeInteger(total))
          throw new RangeError('Total em centavos excede o limite seguro.')
        return total
      }, 0)
      return transactions
    },
    enabled: valid && !!user && search === settledSearch,
    staleTime: 60000,
  })

  if (!valid) return null
  if (
    query.isFetching ||
    query.isPending ||
    search !== settledSearch ||
    categoriesLoading
  )
    return (
      <p role="status">
        {type === 'income'
          ? 'Calculando distribuição das receitas…'
          : 'Calculando distribuição dos aportes…'}
      </p>
    )
  if (query.error || categoriesError)
    return (
      <LoadError
        error={query.error || categoriesError}
        retry={() => Promise.all([query.refetch(), refetchCategories()])}
      />
    )

  const start = criteria.startDate
    ? format(criteria.startDate, 'dd/MM/yyyy')
    : 'sem limite inicial'
  const end = criteria.endDate
    ? format(criteria.endDate, 'dd/MM/yyyy')
    : 'sem limite final'
  const basis =
    criteria.dateBasis === 'purchase' ? 'data da compra' : 'competência'
  return (
    <CategoryDonutChart
      type={type}
      data={AnalyticsHelper.getCategoryShare(
        query.data ?? [],
        categories,
        type,
      )}
      description={`Resultados filtrados · ${start} a ${end} · ${basis}`}
    />
  )
}
