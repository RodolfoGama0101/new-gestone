'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { Transaction } from '@/types/transaction'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'
import { BalanceTrendAreaChart } from '@/components/charts/balance-trend-area-chart'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import { startOfMonth, subMonths } from 'date-fns'
import { BarChart3, Loader2 } from 'lucide-react'

const EMPTY_ARRAY: Transaction[] = []

export default function AnalyticsPage() {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const { categories, isLoading: isCategoriesLoading } = useCategories()

  // Quantidade de meses para exibição histórica (padrão: 6 meses)
  const [monthsCount, setMonthsCount] = React.useState(6)

  const startDate = startOfMonth(subMonths(new Date(), monthsCount - 1))

  // Busca todos os lançamentos do período selecionado
  const transactionsQuery = useQuery({
    queryKey: ['analyticsHistory', userId, monthsCount],
    queryFn: async (): Promise<Transaction[]> => {
      const colRef = collection(db, 'users', userId, 'transactions')
      const q = query(
        colRef,
        where('date', '>=', Timestamp.fromDate(startDate)),
        orderBy('date', 'asc')
      )
      const snapshot = await getDocs(q)
      const txs: Transaction[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        txs.push({
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
      return txs
    },
    enabled: !!userId,
  })

  const isLoading = transactionsQuery.isLoading || isCategoriesLoading
  const transactions = transactionsQuery.data ?? EMPTY_ARRAY

  // Prepara os dados para os gráficos
  const donutData = React.useMemo(() => {
    return AnalyticsHelper.getCategoryShare(transactions, categories, 'expense')
  }, [transactions, categories])

  const monthlyHistory = React.useMemo(() => {
    return AnalyticsHelper.getMonthlyHistory(transactions, monthsCount)
  }, [transactions, monthsCount])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm sm:text-base font-medium">
            Analise seu fluxo de caixa e distribuição de despesas.
          </p>
        </div>

        {/* Seletor de Intervalo */}
        <div className="flex items-center gap-1.5 bg-card border border-border p-1.5 rounded-xl shadow-xs self-start sm:self-auto">
          {[3, 6, 12].map((count) => (
            <Button
              key={count}
              variant={monthsCount === count ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setMonthsCount(count)}
              className="text-xs font-semibold px-3.5 h-8 cursor-pointer rounded-lg transition-all"
            >
              {count} Meses
            </Button>
          ))}
        </div>
      </div>

      {/* Relatórios e Gráficos */}
      {transactions.length === 0 ? (
        <EmptyState
          title="Sem dados suficientes"
          description="Registre lançamentos de receitas ou despesas nas abas correspondentes para gerar relatórios visuais."
          icon={BarChart3}
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Gráfico de Barras: Fluxo de Caixa */}
          <div className="md:col-span-2">
            <CashFlowBarChart data={monthlyHistory} />
          </div>

          {/* Gráfico de Área: Evolução do Saldo */}
          <div>
            <BalanceTrendAreaChart data={monthlyHistory} />
          </div>

          {/* Gráfico de Rosca: Gastos por Categoria */}
          <div>
            <CategoryDonutChart data={donutData} />
          </div>
        </div>
      )}
    </div>
  )
}
