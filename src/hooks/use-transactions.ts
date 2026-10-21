import { useQuery, useMutation, useQueryClient, skipToken } from '@tanstack/react-query'
import { TransactionService, GetTransactionsFilters } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { toast } from 'sonner'
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import * as React from 'react'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { invalidateTransactionData, transactionPaginationKey } from '@/lib/transaction-cache'

export function useTransactions(filters: Omit<GetTransactionsFilters, 'lastVisible'> = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''
  // Estado compartilhado no QueryClient, sem consulta de rede. Toda mutação de
  // lançamentos muda a revisão, inclusive quando executada fora deste hook.
  const { data: revision } = useQuery({
    queryKey: transactionPaginationKey(userId),
    queryFn: skipToken,
    initialData: 0,
  })

  // Paginação
  const search = normalizeTransactionSearch(filters.search ?? '')
  const [settledSearch, setSettledSearch] = React.useState(search)
  React.useEffect(() => {
    const timeout = setTimeout(() => setSettledSearch(search), 300)
    return () => clearTimeout(timeout)
  }, [search])
  const limitVal = filters.limitCount || (filters.creditCardId ? 100 : 10)
  const filtersKey = JSON.stringify([
    userId, filters.type ?? null, filters.categoryId ?? null,
    filters.creditCardId ?? null, filters.startDate?.getTime() ?? null,
    filters.endDate?.getTime() ?? null, limitVal, search, revision,
  ])
  const [pagination, dispatchPagination] = React.useReducer(
    (
      state: {
        filtersKey: string
        currentPage: number
        pageCursors: Record<number, QueryDocumentSnapshot<DocumentData> | null>
      },
      action:
        | { type: 'reset'; filtersKey: string }
        | { type: 'next'; cursor: QueryDocumentSnapshot<DocumentData> }
        | { type: 'previous' }
    ) => {
      if (action.type === 'reset') return { filtersKey: action.filtersKey, currentPage: 1, pageCursors: { 1: null } }
      if (action.type === 'next') {
        return {
          ...state,
          currentPage: state.currentPage + 1,
          pageCursors: { ...state.pageCursors, [state.currentPage + 1]: action.cursor },
        }
      }
      return { ...state, currentPage: Math.max(1, state.currentPage - 1) }
    },
    { filtersKey, currentPage: 1, pageCursors: { 1: null } }
  )

  const hasChangedFilters = pagination.filtersKey !== filtersKey
  const currentPage = hasChangedFilters ? 1 : pagination.currentPage
  const pageCursors: Record<number, QueryDocumentSnapshot<DocumentData> | null> = hasChangedFilters
    ? { 1: null }
    : pagination.pageCursors

  React.useEffect(() => {
    if (hasChangedFilters) dispatchPagination({ type: 'reset', filtersKey })
  }, [filtersKey, hasChangedFilters])

  const transactionsQuery = useQuery({
    queryKey: ['transactions', userId, filtersKey, currentPage, pageCursors[currentPage]?.id ?? null],
    queryFn: () =>
      TransactionService.getPaged(userId, {
        ...filters,
        search,
        limitCount: limitVal,
        lastVisible: pageCursors[currentPage] ?? undefined,
      }),
    enabled: !!userId && search === settledSearch,
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
      TransactionService.create(userId, data),
    onSuccess: async () => {
      await invalidateTransactionData(queryClient, userId)
      toast.success('Lançamento registrado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao registrar lançamento.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string
      data: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
    }) => TransactionService.update(userId, transactionId, data),
    onSuccess: async () => {
      await invalidateTransactionData(queryClient, userId)
      toast.success('Lançamento atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar lançamento.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) =>
      TransactionService.delete(userId, transactionId),
    onSuccess: async () => {
      await invalidateTransactionData(queryClient, userId)
      toast.success('Lançamento excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir lançamento.')
    },
  })

  const transactions = transactionsQuery.data?.transactions ?? []
  const lastVisible = transactionsQuery.data?.lastVisible ?? null

  const hasNextPage = Boolean(transactionsQuery.data?.hasMore && lastVisible)
  const hasPreviousPage = currentPage > 1

  const goToNextPage = () => {
    if (hasNextPage && lastVisible) {
      dispatchPagination({ type: 'next', cursor: lastVisible })
    }
  }

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      dispatchPagination({ type: 'previous' })
    }
  }

  return {
    transactions,
    isLoading: search !== settledSearch || transactionsQuery.isLoading || transactionsQuery.isFetching,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    currentPage,
    error: transactionsQuery.error,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTransaction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTransaction: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
