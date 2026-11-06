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
import {
  MonthlyGoal,
  MonthlyExpenseCategories,
  MonthlyFlow,
} from '@/components/dashboard/monthly-insights'
import { CardConsolidated } from '@/components/credit-cards/card-consolidated'

export default function DashboardPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const { date: selectedDate } = useWorkMonth()

  const { summary, isLoading, error, refetch } = useAnalytics(selectedDate)

  return (
    <div className="space-y-8">
      {/* Header com saudação e seletor de mês */}
      <PageHeader
        title="Visão geral"
        description="Receitas, despesas, aportes e decisões do mês por competência."
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
          {error ? (
            <LoadError error={error} retry={refetch} />
          ) : (
            <>
              <SummaryCards
                income={summary?.income ?? 0}
                incomeChange={summary?.incomeChangePercent ?? null}
                expense={summary?.expense ?? 0}
                expenseChange={summary?.expenseChangePercent ?? null}
                investment={summary?.investment ?? 0}
                investmentChange={summary?.investmentChangePercent ?? null}
                incomeCount={summary?.incomeCount ?? 0}
                expenseCount={summary?.expenseCount ?? 0}
                investmentCount={summary?.investmentCount ?? 0}
                isLoading={isLoading}
              />
              <BalanceCard
                selectedMonth={selectedDate}
                balance={summary?.balance ?? 0}
                changePercent={summary?.balanceChangePercent ?? null}
                data={summary?.dailyBalance ?? []}
                isLoading={isLoading}
                futureCardExpenses={summary?.futureCardExpenses ?? 0}
                availableBalance={summary?.availableBalance ?? 0}
                referenceDate={summary?.reservationReferenceDate}
              />
            </>
          )}
          <MonthlyGoal />
          {summary && !error && (
            <div className="grid min-w-0 gap-6 xl:grid-cols-2">
              <MonthlyFlow summary={summary} />
              <MonthlyExpenseCategories summary={summary} />
            </div>
          )}
          <CardConsolidated month={selectedDate} compact />
        </div>

        {/* Histórico após os resumos e a projeção. */}
        <div className="min-w-0">
          {!error && (
            <RecentTransactions
              transactions={summary?.currentTransactions ?? []}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
}
