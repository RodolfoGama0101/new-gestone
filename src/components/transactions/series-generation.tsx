'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { TransactionSeriesService } from '@/services/transaction-series.service'
import { invalidateTransactionData } from '@/lib/transaction-cache'
import { Button } from '@/components/ui/button'
import { useCurrentDate } from '@/hooks/use-current-date'
import { format } from 'date-fns'

export function SeriesGeneration() {
  const { user } = useAuth()
  const client = useQueryClient()
  const today = useCurrentDate()
  const query = useQuery({
    queryKey: ['seriesGeneration', user?.uid, format(today, 'yyyy-MM-dd')],
    queryFn: () => TransactionSeriesService.generateDue(user!.uid),
    enabled: !!user,
    staleTime: 60000,
    retry: false,
  })
  useEffect(() => {
    if (user && (query.data || query.error))
      void invalidateTransactionData(client, user.uid)
  }, [
    client,
    user,
    query.data,
    query.error,
    query.dataUpdatedAt,
    query.errorUpdatedAt,
  ])
  if (query.error)
    return (
      <p role="alert" className="border-b p-3 text-sm">
        Não foi possível gerar todos os lançamentos programados. O restante será
        retomado sem duplicatas.{' '}
        <Button variant="outline" onClick={() => query.refetch()}>
          Tentar novamente
        </Button>
      </p>
    )
  return query.isFetching ? (
    <p role="status" className="p-3 text-sm">
      Verificando lançamentos programados…
    </p>
  ) : null
}
