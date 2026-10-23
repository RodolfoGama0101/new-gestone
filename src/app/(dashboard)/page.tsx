'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { BalanceCard } from '@/components/dashboard/balance-card'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { PageHeader } from '@/components/shared/page-header'
import { MonthSelector } from '@/components/shared/month-selector'
import { useAuth } from '@/contexts/auth-context'

export default function DashboardPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const { summary, isLoading, error, refetch } = useAnalytics(selectedDate)

  // Saudação amigável baseada no horário local — memoizada para não recalcular a cada render
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  const userFirstName = user?.displayName
    ? user.displayName.split(' ')[0]
    : 'Usuário'

  if (error) return <LoadError error={error} retry={refetch} />

  return (
    <div className="animate-in fade-in space-y-7 duration-300">
      {/* Header com saudação e seletor de mês */}
      <PageHeader
        title={`${greeting}, ${userFirstName}!`}
        description="Aqui está um resumo de sua saúde financeira atual."
        action={
          <MonthSelector value={selectedDate} onChange={setSelectedDate} />
        }
      />

      {/* Grid Principal */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Coluna principal: Saldo + Cards de Receita/Despesa */}
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <BalanceCard
            balance={summary?.balance ?? 0}
            changePercent={summary?.balanceChangePercent ?? 0}
            data={summary?.dailyBalance ?? []}
            isLoading={isLoading}
            futureCardExpenses={summary?.futureCardExpenses ?? 0}
            availableBalance={summary?.availableBalance ?? 0}
            referenceDate={summary?.reservationReferenceDate}
          />
          <SummaryCards
            income={summary?.income ?? 0}
            incomeChange={summary?.incomeChangePercent ?? 0}
            expense={summary?.expense ?? 0}
            expenseChange={summary?.expenseChangePercent ?? 0}
            investment={summary?.investment ?? 0}
            investmentChange={summary?.investmentChangePercent ?? 0}
            incomeCount={summary?.incomeCount ?? 0}
            expenseCount={summary?.expenseCount ?? 0}
            investmentCount={summary?.investmentCount ?? 0}
            isLoading={isLoading}
          />
        </div>

        {/* Coluna lateral: Lançamentos Recentes */}
        <div className="min-w-0 xl:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
