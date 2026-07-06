import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TransactionService, GetTransactionsFilters } from '@/services/transaction.service'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { toast } from 'sonner'
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'

export function useTransactions(filters: Omit<GetTransactionsFilters, 'lastVisible'> = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''

  const transactionsQuery = useInfiniteQuery({
    queryKey: ['transactions', userId, filters.type, filters.categoryId],
    queryFn: ({ pageParam }) =>
      TransactionService.getPaged(userId, {
        ...filters,
        lastVisible: pageParam as QueryDocumentSnapshot<DocumentData> | undefined,
      }),
    initialPageParam: undefined as QueryDocumentSnapshot<DocumentData> | undefined,
    getNextPageParam: (lastPage) => lastPage.lastVisible ?? undefined,
    enabled: !!userId,
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
      TransactionService.create(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', userId] })
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
      toast.success('Lançamento excluído com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao excluir lançamento.')
    },
  })

  const transactions = transactionsQuery.data?.pages.flatMap((page) => page.transactions) ?? []

  return {
    transactions,
    isLoading: transactionsQuery.isLoading,
    isFetchingNextPage: transactionsQuery.isFetchingNextPage,
    hasNextPage: transactionsQuery.hasNextPage,
    fetchNextPage: transactionsQuery.fetchNextPage,
    error: transactionsQuery.error,
    createTransaction: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTransaction: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteTransaction: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
