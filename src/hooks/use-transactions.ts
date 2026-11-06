import { useQuery, useMutation, useQueryClient, skipToken } from '@tanstack/react-query'
import { TransactionService, GetTransactionsFilters } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { toast } from 'sonner'
import * as React from 'react'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { invalidateTransactionData, transactionPaginationKey } from '@/lib/transaction-cache'

type PaginationPosition = { filtersKey: string; page: number; revision: number }

export function useTransactions(filters: Omit<GetTransactionsFilters, 'lastVisible'> = {}, enabled = true, listId = 'default') {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''
  // Estado compartilhado no QueryClient, sem consulta de rede. Toda mutação de
  // lançamentos muda a revisão, inclusive quando executada fora deste hook.
  const { data: revision = 0 } = useQuery({
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
    userId, listId, filters.type ?? null, filters.categoryId ?? null,
    filters.creditCardId ?? null, filters.startDate?.getTime() ?? null,
    filters.endDate?.getTime() ?? null, filters.dateBasis ?? null,
    filters.minAmount ?? null, filters.maxAmount ?? null, filters.modality ?? null, limitVal, search,
  ])
  const positionKey = ['transactionPosition', userId, listId, filtersKey] as const
  const [position, setPosition] = React.useReducer(
    (_state: PaginationPosition, next: PaginationPosition) => next,
    queryClient.getQueryData<PaginationPosition>(positionKey) ?? { filtersKey, page: 1, revision },
  )
  const hasChangedFilters = position.filtersKey !== filtersKey
  const desiredPage = hasChangedFilters ? 1 : position.page
  const recovering = !hasChangedFilters && position.revision !== revision

  React.useEffect(() => {
    if (hasChangedFilters) {
      const next = { filtersKey, page: 1, revision }
      setPosition(next)
      queryClient.setQueryData(['transactionPosition', userId, listId, filtersKey], next)
    }
  }, [filtersKey, hasChangedFilters, listId, queryClient, revision, userId])

  const transactionsQuery = useQuery({
    queryKey: ['transactions', userId, filtersKey, revision, desiredPage, recovering],
    queryFn: async ({ signal }) => {
      let cursor: GetTransactionsFilters['lastVisible']
      let first: Awaited<ReturnType<typeof TransactionService.getPaged>> | undefined
      let lastNonEmpty: { result: Awaited<ReturnType<typeof TransactionService.getPaged>>; page: number } | undefined
      for (let page = 1; page <= desiredPage; page++) {
        const result = await TransactionService.getPaged(userId, {
          ...filters, search, limitCount: limitVal, lastVisible: cursor,
        }, { signal })
        if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError')
        first ??= result
        if (result.transactions.length > 0) lastNonEmpty = { result, page }
        // Um lote vazio com continuação ainda é navegável.
        if (recovering && page > 1 && result.transactions.length === 0 && !result.hasMore) {
          return { ...(lastNonEmpty?.result ?? first), page: lastNonEmpty?.page ?? 1 }
        }
        if (page === desiredPage || !result.hasMore || !result.lastVisible) {
          return { ...result, page }
        }
        cursor = result.lastVisible
      }
      throw new Error('Não foi possível reconstruir a paginação.')
    },
    enabled: enabled && !!userId && search === settledSearch,
  })

  const currentPage = transactionsQuery.data?.page ?? desiredPage
  React.useEffect(() => {
    if (!hasChangedFilters && transactionsQuery.data && currentPage !== desiredPage) {
      const next = { filtersKey, page: currentPage, revision }
      setPosition(next)
      queryClient.setQueryData(['transactionPosition', userId, listId, filtersKey], next)
    }
  }, [currentPage, desiredPage, filtersKey, hasChangedFilters, listId, queryClient, revision, transactionsQuery.data, userId])

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
  const hasPreviousPage = currentPage > 1 && !!transactionsQuery.data

  const goToNextPage = () => {
    if (hasNextPage) {
      const next = { filtersKey, page: currentPage + 1, revision }
      queryClient.setQueryData(positionKey, next)
      setPosition(next)
    }
  }

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      const next = { filtersKey, page: currentPage - 1, revision }
      queryClient.setQueryData(positionKey, next)
      setPosition(next)
    }
  }

  return {
    transactions,
    isLoading: search !== settledSearch || transactionsQuery.isLoading,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    currentPage,
    error: transactionsQuery.error,
    isFetching: transactionsQuery.isFetching,
    refetch: transactionsQuery.refetch,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTransaction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTransaction: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
