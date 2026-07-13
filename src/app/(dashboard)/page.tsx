'use client'

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

  const { summary, isLoading } = useAnalytics(selectedDate)

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1))
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1))

  // Saudação amigável baseada no horário local
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const userFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Usuário'

  // Seletor de Mês
  const monthSelector = (
    <div className="flex items-center gap-0.5 bg-background-100 dark:bg-card border border-border rounded-md p-0.5 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        className="size-7 cursor-pointer rounded-md hover:bg-accent shrink-0"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-3.5 text-muted-foreground" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 min-w-[130px] justify-center">
        <CalendarDays className="size-3 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-foreground capitalize leading-none">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        className="size-7 cursor-pointer rounded-md hover:bg-accent shrink-0"
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-3.5 text-muted-foreground" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Header com saudação e seletor de mês */}
      <PageHeader
        title={`${getGreeting()}, ${userFirstName}!`}
        description="Aqui está um resumo de sua saúde financeira atual."
        action={monthSelector}
      />

      {/* Grid Principal */}
      <div className="grid gap-5 md:grid-cols-3">
        {/* Coluna principal: Saldo + Cards de Receita/Despesa */}
        <div className="md:col-span-2 space-y-4">
          <BalanceCard
            balance={summary?.balance ?? 0}
            changePercent={summary?.balanceChangePercent ?? 0}
            data={summary?.dailyBalance ?? []}
            isLoading={isLoading}
          />
          <SummaryCards
            income={summary?.income ?? 0}
            incomeChange={summary?.incomeChangePercent ?? 0}
            expense={summary?.expense ?? 0}
            expenseChange={summary?.expenseChangePercent ?? 0}
            isLoading={isLoading}
          />
        </div>

        {/* Coluna lateral: Lançamentos Recentes */}
        <div className="md:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
