import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { BudgetService, BudgetLimit } from '@/services/budget.service'

export function useBudget(month: string) {
  const { user } = useAuth()
  const client = useQueryClient()
  const uid = user?.uid || ''
  const query = useQuery({
    queryKey: ['budgets', uid, month],
    queryFn: () => BudgetService.get(uid, month),
    enabled: !!uid && /^\d{4}-(0[1-9]|1[0-2])$/.test(month),
  })
  const mutation = useMutation({
    mutationFn: async (
      action:
        | { goal: number }
        | { limit: BudgetLimit }
        | { remove: string | undefined },
    ) => {
      if (!uid) throw new Error('Autenticação necessária.')
      if ('goal' in action)
        await BudgetService.saveGoal(uid, month, action.goal)
      else if ('limit' in action)
        await BudgetService.saveLimit(uid, month, action.limit)
      else await BudgetService.remove(uid, month, action.remove)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['budgets', uid] }),
  })
  return { ...query, save: mutation.mutateAsync, saving: mutation.isPending }
}
