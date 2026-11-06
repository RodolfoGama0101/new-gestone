import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import {
  TransactionService,
  type GetTransactionsFilters,
} from '@/services/transaction.service'

export function useTransactionTotals(
  filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'>,
  enabled = true,
) {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const criteria = {
    ...filters,
    search: normalizeTransactionSearch(filters.search ?? ''),
  }
  const [settledSearch, setSettledSearch] = useState(criteria.search)
  useEffect(() => {
    const timeout = setTimeout(() => setSettledSearch(criteria.search), 300)
    return () => clearTimeout(timeout)
  }, [criteria.search])
  const query = useQuery({
    queryKey: ['transactionTotals', userId, criteria],
    queryFn: ({ signal }) =>
      TransactionService.getTotals(userId, criteria, { signal }),
    enabled: enabled && !!userId && settledSearch === criteria.search,
    staleTime: 60000,
  })
  return { ...query, isSettling: settledSearch !== criteria.search }
}
