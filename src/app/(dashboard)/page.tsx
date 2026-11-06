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
import { useWorkMonth } from '@/providers/work-month-provider'

export default function DashboardPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const { date: selectedDate } = useWorkMonth()

  const { summary, isLoading, error, refetch } = useAnalytics(selectedDate)

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
