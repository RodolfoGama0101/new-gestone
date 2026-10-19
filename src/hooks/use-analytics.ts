import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/auth-context'
import { Transaction } from '@/types/transaction'
import { AnalyticsService, PeriodSummary } from '@/services/analytics.service'
import { CreditCardService } from '@/services/credit-card.service'
import { startOfMonth, subMonths, format } from 'date-fns'

export function useAnalytics(selectedDate: Date) {
  const { user } = useAuth()
  const userId = user?.uid ?? ''

  const startOfPrevious = startOfMonth(subMonths(selectedDate, 1))
  const referenceDate = new Date()
  const referenceDayKey = format(referenceDate, 'yyyy-MM-dd')

  // A chave separa mês selecionado e dia de referência, sem variar com milissegundos.
  const monthKey = format(selectedDate, 'yyyy-MM')

  const analyticsQuery = useQuery({
    queryKey: ['analytics', userId, monthKey, referenceDayKey],
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
          creditCardId: data.creditCardId ?? null,
          cardClosingDay: data.cardClosingDay ?? null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      })

      // Busca cartões de crédito para calcular ciclos de faturamento no analytics
      const cards = await CreditCardService.getAll(userId)

      return AnalyticsService.calculateSummary(transactions, selectedDate, cards, referenceDate)
    },
    enabled: !!userId,
    // Dados de analytics são invalidados explicitamente após mutações de transações.
    // staleTime: Infinity evita refetches automáticos desnecessários.
    staleTime: Infinity,
  })

  return {
    summary: analyticsQuery.data,
    isLoading: analyticsQuery.isLoading,
    error: analyticsQuery.error,
    refetch: analyticsQuery.refetch,
  }
}

