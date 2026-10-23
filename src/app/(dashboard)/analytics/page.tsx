'use client'

import { formatMoney } from '@/lib/utils/format-money'
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
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { startOfMonth, subMonths, endOfMonth } from 'date-fns'
import { BarChart3, Loader2 } from 'lucide-react'

import { useCreditCards } from '@/hooks/use-credit-cards'
import { filterTransactionPeriod } from '@/lib/utils/transaction-date'

import { AnalyticsDataService } from '@/services/analytics-data.service'
import { useCurrentDate } from '@/hooks/use-current-date'
import { format } from 'date-fns'

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

  const periodTotals = React.useMemo(() => {
    let income = 0
    let expense = 0
    let investment = 0
    transactions.forEach((tx) => {
      if (tx.type === 'income') {
        income += tx.amount
      } else if (tx.type === 'investment') {
        investment += tx.amount
      } else {
        expense += tx.amount
      }
    })
    return {
      income,
      expense,
      investment,
      balance: income - expense - investment,
    }
  }, [transactions])

  // Seletor de Período
  const periodSelector = (
    <div className="bg-card dark:bg-card border-border flex items-center gap-0.5 rounded-md border p-0.5 shadow-sm">
      {[3, 6, 12].map((count) => (
        <Button
          key={count}
          variant={monthsCount === count ? 'default' : 'ghost'}
          size="sm"
          aria-pressed={monthsCount === count}
          onClick={() => setMonthsCount(count)}
          className="h-7 cursor-pointer rounded-md px-2.5 text-xs font-semibold"
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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary size-7 animate-spin" />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in space-y-6 [overflow-wrap:anywhere] duration-200">
      <PageHeader
        title="Relatórios"
        description="Analise seu fluxo de caixa e distribuição de despesas."
        action={periodSelector}
      />

      <p className="text-muted-foreground text-sm">
        Período: {format(startDate, 'dd/MM/yyyy')} a{' '}
        {format(endOfMonth(referenceDate), 'dd/MM/yyyy')}. Compras no cartão
        seguem a competência da fatura.
      </p>
      {transactions.length === 0 ? (
        <EmptyState
          title="Sem dados suficientes"
          description="Registre lançamentos de receitas ou despesas nas abas correspondentes para gerar relatórios visuais."
          icon={BarChart3}
        />
      ) : (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            {/* Total Receitas */}
            <Card className="border-border bg-card flex min-h-20 flex-col justify-between gap-2 rounded-xl p-4 shadow-xs">
              <span className="text-muted-foreground text-xs font-normal">
                Total Receitas (Período)
              </span>
              <span className="text-income text-xl leading-none font-semibold tracking-tight break-words tabular-nums">
                {formatMoney(periodTotals.income)}
              </span>
            </Card>
            {/* Total Despesas */}
            <Card className="border-border bg-card flex min-h-20 flex-col justify-between gap-2 rounded-xl p-4 shadow-xs">
              <span className="text-muted-foreground text-xs font-normal">
                Total Despesas (Período)
              </span>
              <span className="text-expense text-xl leading-none font-semibold tracking-tight break-words tabular-nums">
                {formatMoney(periodTotals.expense)}
              </span>
            </Card>
            {/* Total Investimentos */}
            <Card className="border-border bg-card flex min-h-20 flex-col justify-between gap-2 rounded-xl p-4 shadow-xs">
              <span className="text-muted-foreground text-xs font-normal">
                Investido (Período)
              </span>
              <span className="text-investment text-xl leading-none font-semibold tracking-tight break-words tabular-nums">
                {formatMoney(periodTotals.investment)}
              </span>
            </Card>
            {/* Saldo Líquido */}
            <Card className="border-border bg-card flex min-h-20 flex-col justify-between gap-2 rounded-xl p-4 shadow-xs">
              <span className="text-muted-foreground text-xs font-normal">
                Saldo Líquido (Período)
              </span>
              <span
                className={`text-xl leading-none font-semibold tracking-tight break-words tabular-nums ${periodTotals.balance >= 0 ? 'text-income' : 'text-expense'}`}
              >
                {formatMoney(periodTotals.balance)}
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Fluxo de Caixa — ocupa toda a largura */}
            <div className="min-w-0 md:col-span-2">
              <CashFlowBarChart data={monthlyHistory} />
            </div>

            {/* Evolução do Saldo */}
            <div>
              <BalanceTrendAreaChart data={monthlyHistory} />
            </div>

            {/* Gastos por Categoria */}
            <div>
              <CategoryDonutChart data={donutData} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
