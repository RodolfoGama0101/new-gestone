import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { TransactionService, type GetTransactionsFilters } from '@/services/transaction.service'

export function useTransactionTotals(filters: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'>, enabled = true) {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const criteria = { ...filters, search: normalizeTransactionSearch(filters.search ?? '') }
  return useQuery({
    queryKey: ['transactionTotals', userId, criteria],
    queryFn: ({ signal }) => TransactionService.getTotals(userId, criteria, { signal }),
    enabled: enabled && !!userId,
    staleTime: 60000,
  })
}
