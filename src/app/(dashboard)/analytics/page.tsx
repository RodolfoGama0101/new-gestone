'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { Transaction } from '@/types/transaction'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'
import { BalanceTrendAreaChart } from '@/components/charts/balance-trend-area-chart'
import { ReportSummary } from '@/components/analytics/report-summary'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { startOfMonth, subMonths, endOfMonth } from 'date-fns'
import { BarChart3, Loader2 } from 'lucide-react'

import { useCreditCards } from '@/hooks/use-credit-cards'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'

import { AnalyticsDataService } from '@/services/analytics-data.service'
import { useCurrentDate } from '@/hooks/use-current-date'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const EMPTY_ARRAY: Transaction[] = []

export default function AnalyticsPage() {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const {
    categories,
    error: categoriesError,
    refetch: refetchCategories,
    isLoading: isCategoriesLoading,
  } = useCategories()

  const {
    creditCards,
    error: cardsError,
    refetch: refetchCards,
    isLoading: isCardsLoading,
  } = useCreditCards()

  // Quantidade de meses para exibição histórica (padrão: 6 meses)
  const [monthsCount, setMonthsCount] = React.useState(6)
  const referenceDate = useCurrentDate()

  const startDate = React.useMemo(
    () => startOfMonth(subMonths(referenceDate, monthsCount - 1)),
    [monthsCount, referenceDate],
  )

  // Busca todos os lançamentos do período selecionado
  const transactionsQuery = useQuery({
    queryKey: [
      'analyticsHistory',
      userId,
      monthsCount,
      format(referenceDate, 'yyyy-MM-dd'),
    ],
    queryFn: () =>
      AnalyticsDataService.getHistory(userId, monthsCount, referenceDate),
    staleTime: 60000,
    enabled: !!userId,
  })

  const isLoading =
    transactionsQuery.isLoading || isCategoriesLoading || isCardsLoading
  const transactions = React.useMemo(
    () =>
      filterTransactionPeriod(
        transactionsQuery.data ?? EMPTY_ARRAY,
        startDate,
        endOfMonth(referenceDate),
        creditCards,
      ),
    [transactionsQuery.data, startDate, referenceDate, creditCards],
  )

  // Prepara os dados para os gráficos
  const donutData = React.useMemo(() => {
    return AnalyticsHelper.getCategoryShare(transactions, categories, 'expense')
  }, [transactions, categories])

  const monthlyHistory = React.useMemo(() => {
    return AnalyticsHelper.getMonthlyHistory(
      transactions,
      monthsCount,
      referenceDate,
      creditCards,
    )
  }, [transactions, monthsCount, referenceDate, creditCards])

  // Seletor de Período
  const periodSelector = (
    <div
      role="group"
      aria-label="Período do relatório"
      className="bg-card border-border flex items-center gap-0.5 rounded-md border p-1"
    >
      {[3, 6, 12].map((count) => (
        <Button
          key={count}
          variant={monthsCount === count ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMonthsCount(count)}
          aria-pressed={monthsCount === count}
          className="min-h-10 rounded-md px-3 text-sm font-medium"
        >
          {count} meses
        </Button>
      ))}
    </div>
  )

  const error = transactionsQuery.error || categoriesError || cardsError
  if (error)
    return (
      <LoadError
        error={error}
        retry={() =>
          Promise.all([
            transactionsQuery.refetch(),
            refetchCategories(),
            refetchCards(),
          ])
        }
      />
    )

  return (
    <div className="space-y-8 [overflow-wrap:anywhere]">
      <PageHeader
        title="Relatórios"
        description="Analise seu fluxo de caixa e distribuição de despesas."
        action={periodSelector}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b pb-4 text-sm">
        <span className="font-medium capitalize">
          {format(startDate, 'MMM yyyy', { locale: ptBR })} —{' '}
          {format(referenceDate, 'MMM yyyy', { locale: ptBR })}
        </span>
        <span className="text-muted-foreground text-xs">
          Período por competência · inclui o mês atual
        </span>
      </div>

      {isLoading ? (
        <div
          role="status"
          className="text-muted-foreground flex min-h-[400px] items-center justify-center gap-3 text-sm"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          Carregando relatórios…
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title="Sem dados suficientes"
          description="Registre lançamentos de receitas ou despesas nas abas correspondentes para gerar relatórios visuais."
          icon={BarChart3}
        />
      ) : (
        <div className="space-y-6">
          <ReportSummary data={monthlyHistory} />
          <div className="grid min-w-0 grid-cols-1 gap-6">
            {/* Fluxo de Caixa — ocupa toda a largura */}
            <div className="min-w-0">
              <CashFlowBarChart data={monthlyHistory} />
            </div>

            {/* Evolução do Saldo */}
            <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
              <div className="min-w-0">
                <BalanceTrendAreaChart data={monthlyHistory} />
              </div>

              {/* Gastos por Categoria */}
              <div className="min-w-0">
                <CategoryDonutChart data={donutData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
