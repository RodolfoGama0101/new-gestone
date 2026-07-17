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
      toast.success('Cartão de crédito atualizado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao atualizar cartão de crédito.')
    },
  })

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => CreditCardService.delete(userId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      toast.success('Cartão de crédito excluído com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir cartão de crédito.')
    },
  })

  return {
    creditCards: creditCardsQuery.data ?? [],
    isLoading: creditCardsQuery.isLoading,
    error: creditCardsQuery.error,
    createCreditCard: createCardMutation.mutateAsync,
    isCreating: createCardMutation.isPending,
    updateCreditCard: updateCardMutation.mutateAsync,
    isUpdating: updateCardMutation.isPending,
    deleteCreditCard: deleteCardMutation.mutateAsync,
    isDeleting: deleteCardMutation.isPending,
  }
}
