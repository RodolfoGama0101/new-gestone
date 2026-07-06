import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { AnalyticsService, PeriodSummary } from '@/services/analytics.service'
import { startOfMonth, subMonths } from 'date-fns'

export function useAnalytics(selectedDate: Date) {
  const { user } = useAuth()
  const userId = user?.uid ?? ''

  const startOfPrevious = startOfMonth(subMonths(selectedDate, 1))

  const analyticsQuery = useQuery({
    queryKey: ['analytics', userId, selectedDate.toISOString()],
    queryFn: async (): Promise<PeriodSummary> => {
      const colRef = collection(db, 'users', userId, 'transactions')
      
      // Query otimizada: busca lançamentos apenas a partir do mês anterior ao selecionado
      const q = query(
        colRef,
        where('date', '>=', Timestamp.fromDate(startOfPrevious)),
        orderBy('date', 'asc')
      )
      
      const snapshot = await getDocs(q)
      const transactions: Transaction[] = []
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        transactions.push({
          id: docSnap.id,
          type: data.type,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          date: data.date,
          tags: data.tags ?? [],
          notes: data.notes ?? null,
          recurring: data.recurring ?? false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })

      return AnalyticsService.calculateSummary(transactions, selectedDate)
    },
    enabled: !!userId,
  })

  return {
    summary: analyticsQuery.data,
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  }
}
