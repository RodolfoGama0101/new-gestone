'use client'

import * as React from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { BalanceCard } from '@/components/dashboard/balance-card'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays
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

  // Nome formatado do usuário
  const userFirstName = user?.displayName ? user.displayName.split(' ')[0] : 'Usuário'

  return (
    <div className="space-y-6">
      {/* Top Header com Saudação e Seletor de Mês */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {userFirstName}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Aqui está um resumo de sua saúde financeira atual.
          </p>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto border border-border bg-card p-1 rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePrevMonth}
            className="size-8 cursor-pointer"
          >
            <ChevronLeft className="size-4 text-muted-foreground hover:text-foreground" />
          </Button>
          
          <div className="flex items-center gap-1.5 px-3 min-w-[130px] justify-center text-sm font-semibold text-foreground">
            <CalendarDays className="size-4 text-muted-foreground shrink-0" />
            <span className="capitalize leading-none">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleNextMonth}
            className="size-8 cursor-pointer"
          >
            <ChevronRight className="size-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </div>

      {/* Grid Principal do Dashboard */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna Esquerda/Meio: Cards Financeiros */}
        <div className="md:col-span-2 space-y-6">
          {/* Card de Saldo Líquido com Sparkline */}
          <BalanceCard
            balance={summary?.balance ?? 0}
            changePercent={summary?.balanceChangePercent ?? 0}
            data={summary?.dailyBalance ?? []}
            isLoading={isLoading}
          />

          {/* Cards de Receitas e Despesas */}
          <SummaryCards
            income={summary?.income ?? 0}
            incomeChange={summary?.incomeChangePercent ?? 0}
            expense={summary?.expense ?? 0}
            expenseChange={summary?.expenseChangePercent ?? 0}
            isLoading={isLoading}
          />
        </div>

        {/* Coluna Direita: Lançamentos Recentes */}
        <div className="md:col-span-1">
          <RecentTransactions />
        </div>
      </div>
    </div>
  )
}
