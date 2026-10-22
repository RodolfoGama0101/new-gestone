import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCardService } from '@/services/credit-card.service'
import { useAuth } from '@/contexts/auth-context'
import { CreditCard } from '@/types/credit-card'
import { toast } from 'sonner'

export function useCreditCards() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''

  const creditCardsQuery = useQuery({
    queryKey: ['creditCards', userId],
    queryFn: () => CreditCardService.getAll(userId),
    enabled: !!userId,
    staleTime: Infinity, // Os cartões raramente mudam
  })

  const createCardMutation = useMutation({
    mutationFn: (data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) =>
      CreditCardService.create(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      toast.success('Cartão de crédito cadastrado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao cadastrar cartão de crédito.')
    },
  })

  const updateCardMutation = useMutation({
    mutationFn: ({
      cardId,
      data,
    }: {
      cardId: string
      data: Partial<Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>>
    }) => CreditCardService.update(userId, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] })
      toast.success('Cartão de crédito atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar cartão de crédito.')
    },
  })

  const archiveCardMutation = useMutation({
    mutationFn: (cardId: string) => CreditCardService.archive(userId, cardId),
    onSuccess: async () => {
      await Promise.all(['creditCards', 'transactions', 'analytics', 'analyticsHistory'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key, userId] })))
      toast.success('Cartão arquivado. O histórico foi preservado.')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Erro ao arquivar cartão de crédito.'
      toast.error(message)
    },
  })

  return {
    creditCards: creditCardsQuery.data ?? [],
    isLoading: creditCardsQuery.isLoading,
    error: creditCardsQuery.error,
    refetch: creditCardsQuery.refetch,
    createCreditCard: createCardMutation.mutateAsync,
    isCreating: createCardMutation.isPending,
    updateCreditCard: updateCardMutation.mutateAsync,
    isUpdating: updateCardMutation.isPending,
    archiveCreditCard: archiveCardMutation.mutateAsync,
    isArchiving: archiveCardMutation.isPending,
  }
}
