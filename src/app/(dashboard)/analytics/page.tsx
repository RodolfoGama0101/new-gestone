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
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
          creditCardId: data.creditCardId ?? null,
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
    <div className="flex items-center gap-0.5 bg-background-100 dark:bg-card border border-border rounded-md p-0.5 shadow-sm">
      {[3, 6, 12].map((count) => (
        <Button
          key={count}
          variant={monthsCount === count ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMonthsCount(count)}
          className="text-xs font-semibold px-2.5 h-7 cursor-pointer rounded-md"
        >
          {count}M
        </Button>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Relatórios"
        description="Analise seu fluxo de caixa e distribuição de despesas."
        action={periodSelector}
      />

      {transactions.length === 0 ? (
        <EmptyState
          title="Sem dados suficientes"
          description="Registre lançamentos de receitas ou despesas nas abas correspondentes para gerar relatórios visuais."
          icon={BarChart3}
        />
      ) : (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            {/* Total Receitas */}
            <Card className="border-border bg-card shadow-xs rounded-md p-4 flex flex-col justify-between h-20">
              <span className="text-[11px] font-normal text-muted-foreground">Total Receitas (Período)</span>
              <span className="text-xl font-semibold text-green-700 dark:text-green-500 tracking-tight leading-none">
                {(periodTotals.income / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </Card>
            {/* Total Despesas */}
            <Card className="border-border bg-card shadow-xs rounded-md p-4 flex flex-col justify-between h-20">
              <span className="text-[11px] font-normal text-muted-foreground">Total Despesas (Período)</span>
              <span className="text-xl font-semibold text-red-700 dark:text-red-500 tracking-tight leading-none">
                {(periodTotals.expense / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </Card>
            {/* Total Investimentos */}
            <Card className="border-border bg-card shadow-xs rounded-md p-4 flex flex-col justify-between h-20">
              <span className="text-[11px] font-normal text-muted-foreground">Investido (Período)</span>
              <span className="text-xl font-semibold text-violet-700 dark:text-violet-500 tracking-tight leading-none">
                {(periodTotals.investment / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </Card>
            {/* Saldo Líquido */}
            <Card className="border-border bg-card shadow-xs rounded-md p-4 flex flex-col justify-between h-20">
              <span className="text-[11px] font-normal text-muted-foreground">Saldo Líquido (Período)</span>
              <span className={`text-xl font-semibold tracking-tight leading-none ${periodTotals.balance >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>
                {(periodTotals.balance / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </Card>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Fluxo de Caixa — ocupa toda a largura */}
            <div className="md:col-span-2">
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
