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
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageCursors, setPageCursors] = React.useState<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({
    1: null,
  })

  // Se os filtros mudarem, resetamos para a primeira página
  const filtersKey = `${filters.type || ''}-${filters.categoryId || ''}-${filters.creditCardId || ''}`
  React.useEffect(() => {
    setCurrentPage(1)
    setPageCursors({ 1: null })
  }, [filtersKey])

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
      setCurrentPage(1)
      setPageCursors({ 1: null })
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
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
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      toast.success('Lançamento excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir lançamento.')
    },
  })

  const transactions = transactionsQuery.data?.transactions ?? []
  const lastVisible = transactionsQuery.data?.lastVisible ?? null

  const hasNextPage = transactions.length === limitVal && !!lastVisible
  const hasPreviousPage = currentPage > 1

  const goToNextPage = () => {
    if (hasNextPage && lastVisible) {
      setPageCursors((prev) => ({
        ...prev,
        [currentPage + 1]: lastVisible,
      }))
      setCurrentPage((prev) => prev + 1)
    }
  }

  const goToPreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1)
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
