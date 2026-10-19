import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useCurrentDate } from './use-current-date'
import { AnalyticsDataService } from '@/services/analytics-data.service'
import { format } from 'date-fns'

export function useAnalytics(selectedDate: Date) {
  const { user } = useAuth()
  const reference = useCurrentDate()
  const result = useQuery({
    queryKey: ['analytics', user?.uid, format(selectedDate, 'yyyy-MM'), format(reference, 'yyyy-MM-dd')],
    queryFn: () => AnalyticsDataService.getSummary(user!.uid, selectedDate, reference),
    enabled: !!user,
    staleTime: 60000,
  })
  return { summary: result.data, isLoading: result.isLoading, error: result.error, refetch: result.refetch }
}
