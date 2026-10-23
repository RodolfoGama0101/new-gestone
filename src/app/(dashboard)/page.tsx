'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useAnalytics } from '@/hooks/use-analytics'
import { BalanceCard } from '@/components/dashboard/balance-card'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

export default function DashboardPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  const { summary, isLoading, error, refetch } = useAnalytics(selectedDate)

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1))
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1))

  // Seletor de Mês — memoizado para evitar recriar o JSX a cada re-render
  const monthSelector = (
    <div className="bg-background border-border flex w-full min-w-0 items-center justify-between gap-1 rounded-md border p-1 sm:w-auto">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevMonth}
        className="hover:bg-accent size-10 shrink-0 rounded-md"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="text-muted-foreground size-3.5" />
      </Button>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="flex min-w-0 items-center justify-center gap-2 px-2 py-2"
      >
        <CalendarDays className="text-muted-foreground size-3 shrink-0" />
        <span className="text-foreground text-center text-sm font-medium break-words capitalize">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        className="hover:bg-accent size-10 shrink-0 rounded-md"
        aria-label="Próximo mês"
      >
        <ChevronRight className="text-muted-foreground size-3.5" />
      </Button>
    </div>
  )

  if (error) return <LoadError error={error} retry={refetch} />

  return (
    <div className="space-y-8">
      {/* Header com saudação e seletor de mês */}
      <PageHeader
        title="Visão geral"
        description="Acompanhe seu saldo e os movimentos do mês."
        actionClassName="w-full flex-col items-stretch sm:w-auto sm:flex-row [&_button]:min-h-11"
        action={
          <>
            {monthSelector}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger
                render={<Button className="min-h-11">Novo lançamento</Button>}
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo lançamento</DialogTitle>
                </DialogHeader>
                <TransactionForm onSuccess={() => setIsAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        }
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
            selectedMonth={selectedDate}
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
