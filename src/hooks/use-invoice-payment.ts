import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/auth-context'
import { InvoicePaymentService } from '@/services/invoice-payment.service'

export function useInvoicePayment(cardId: string, month: Date) {
  const { user } = useAuth()
  const uid = user?.uid || ''
  const client = useQueryClient()
  const key = ['invoicePayments', uid, cardId, format(month, 'yyyy-MM')]
  const query = useQuery({
    queryKey: key,
    queryFn: () => InvoicePaymentService.get(uid, cardId, month),
    enabled: !!uid,
  })
  const mutation = useMutation({
    mutationFn: async (amount: number | null) => {
      if (!uid) throw new Error('Autenticação necessária.')
      if (amount === null)
        await InvoicePaymentService.reverse(uid, cardId, month)
      else await InvoicePaymentService.pay(uid, cardId, month, amount)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  })
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending }
}
