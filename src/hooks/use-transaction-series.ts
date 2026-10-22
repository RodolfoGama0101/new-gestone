import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { TransactionSeriesService } from '@/services/transaction-series.service'
import { invalidateTransactionData } from '@/lib/transaction-cache'

export function useTransactionSeries() {
  const { user } = useAuth()
  const uid = user?.uid || ''
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['transactionSeries', uid],
    queryFn: () => TransactionSeriesService.list(uid),
    enabled: !!uid,
  })
  const mutation = useMutation({
    mutationFn: async (
      action:
        | { kind: 'generate' }
        | { kind: 'cancel'; id: string; from: Date }
        | { kind: 'edit'; id: string; amount: number; description: string },
    ) => {
      if (!uid) throw new Error('Autenticação necessária.')
      if (action.kind === 'generate')
        await TransactionSeriesService.generateDue(uid)
      else if (action.kind === 'cancel')
        await TransactionSeriesService.cancel(uid, action.id, action.from)
      else
        await TransactionSeriesService.editFuture(
          uid,
          action.id,
          action.amount,
          action.description,
        )
    },
    onSettled: async () => {
      await Promise.all([
        query.refetch(),
        invalidateTransactionData(client, uid),
      ])
    },
  })
  return { ...query, perform: mutation.mutateAsync, busy: mutation.isPending }
}
