import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TransactionService, GetTransactionsFilters } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { toast } from 'sonner'
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
import * as React from 'react'

export function useTransactions(filters: Omit<GetTransactionsFilters, 'lastVisible'> = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''

  // Paginação
  const filtersKey = `${filters.type || ''}-${filters.categoryId || ''}-${filters.creditCardId || ''}`
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

  const limitVal = filters.limitCount || (filters.creditCardId ? 100 : 10)

  const transactionsQuery = useQuery({
    queryKey: ['transactions', userId, filters.type, filters.categoryId, filters.creditCardId, currentPage, pageCursors[currentPage]],
    queryFn: () =>
      TransactionService.getPaged(userId, {
        ...filters,
        limitCount: limitVal,
        lastVisible: pageCursors[currentPage] ?? undefined,
      }),
    enabled: !!userId,
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
      TransactionService.create(userId, data),
    onSuccess: () => {
      dispatchPagination({ type: 'reset', filtersKey })
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      queryClient.invalidateQueries({ queryKey: ['analyticsHistory', userId] })
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      queryClient.invalidateQueries({ queryKey: ['analyticsHistory', userId] })
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      toast.success('Lançamento atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar lançamento.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (transactionId: string) =>
      TransactionService.delete(userId, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      queryClient.invalidateQueries({ queryKey: ['analyticsHistory', userId] })
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
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
    isLoading: transactionsQuery.isLoading || transactionsQuery.isFetching,
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
