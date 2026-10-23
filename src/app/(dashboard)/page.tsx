'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { BalanceCard } from '@/components/dashboard/balance-card'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const { summary, isLoading, error, refetch } = useAnalytics(selectedDate)

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1))
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1))

  // Saudação amigável baseada no horário local — memoizada para não recalcular a cada render
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  const userFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Usuário'

  // Seletor de Mês — memoizado para evitar recriar o JSX a cada re-render
  const monthSelector = (
      <div className="flex max-w-full flex-wrap items-center justify-between gap-1 bg-background border border-border rounded-md p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="size-10 rounded-md hover:bg-accent shrink-0"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-3.5 text-muted-foreground" />
        </Button>

        <div className="order-first flex w-full min-w-0 items-center justify-center gap-2 px-2 py-2 sm:order-none sm:w-auto">
          <CalendarDays className="size-3 text-muted-foreground shrink-0" />
          <span className="break-words text-center text-sm font-medium text-foreground capitalize">
            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="size-10 rounded-md hover:bg-accent shrink-0"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </Button>
      </div>
    )

  if (error) return <LoadError error={error} retry={refetch} />

  return (
    <div className="space-y-8">
      {/* Header com saudação e seletor de mês */}
      <PageHeader
        title={`${greeting}, ${userFirstName}!`}
        description="Aqui está um resumo de sua saúde financeira atual."
        action={monthSelector}
      />

      {/* Grid Principal */}
      <div className="flex flex-col gap-6">
        {/* Coluna principal: Saldo + Cards de Receita/Despesa */}
        <div className="flex min-w-0 flex-col gap-6">
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
          <BalanceCard
            balance={summary?.balance ?? 0}
            changePercent={summary?.balanceChangePercent ?? 0}
            data={summary?.dailyBalance ?? []}
            isLoading={isLoading}
            futureCardExpenses={summary?.futureCardExpenses ?? 0}
            availableBalance={summary?.availableBalance ?? 0}
            referenceDate={summary?.reservationReferenceDate}
          />
        </div>

        {/* Histórico após os resumos e a projeção. */}
        <div className="min-w-0">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
