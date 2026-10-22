import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import type { CreditCard } from '@/types/credit-card'
import { TransactionService } from '@/services/transaction.service'
import { invalidateTransactionData } from '@/lib/transaction-cache'

export function useCardInvoice(card: CreditCard, month: Date) {
  const { user } = useAuth()
  const client = useQueryClient()
  const invoice = useQuery({
    queryKey: ['transactions', user?.uid, 'invoice', card.id, format(month, 'yyyy-MM'), card.closingDay],
    queryFn: () => TransactionService.getInvoice(user!.uid, card, month),
    enabled: !!user,
  })
  const deletion = useMutation({
    mutationFn: (id: string) => TransactionService.delete(user!.uid, id),
    onSuccess: async () => {
      await invalidateTransactionData(client, user!.uid)
    },
  })
  return { ...invoice, deleteTransaction: deletion.mutateAsync }
}
