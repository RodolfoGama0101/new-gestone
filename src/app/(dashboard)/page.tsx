'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { Plus } from 'lucide-react'
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
    <div className="space-y-6 min-[961px]:space-y-8">
      <PageHeader
        title="Visão geral"
        description="Acompanhe seus lançamentos e o resultado do mês por competência."
        actionClassName="w-full min-[601px]:w-auto [&_button]:min-h-[46px]"
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger
              render={
                <Button className="w-full min-[601px]:w-auto">
                  <Plus aria-hidden="true" />
                  Novo lançamento
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo lançamento</DialogTitle>
              </DialogHeader>
              <TransactionForm onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid min-w-0 gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
        <div className="min-w-0 space-y-4">
          {error ? (
            <LoadError error={error} retry={refetch} />
          ) : (
            <>
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
            </>
          )}
        </div>
        <aside
          aria-label="Planejamento do mês"
          className="divide-border border-border min-w-0 divide-y self-start rounded-lg border min-[601px]:grid min-[601px]:grid-cols-2 min-[601px]:divide-x min-[601px]:divide-y-0 min-[1200px]:block min-[1200px]:divide-x-0 min-[1200px]:divide-y"
        >
          <MonthlyGoal />
          <CardConsolidated month={selectedDate} compact />
        </aside>
      </div>
      {!error && (
        <RecentTransactions
          transactions={summary?.currentTransactions ?? []}
          isLoading={isLoading}
        />
      )}
      {summary && !error && (
        <div className="grid min-w-0 gap-6 min-[1200px]:grid-cols-2">
          <MonthlyFlow summary={summary} />
          <MonthlyExpenseCategories summary={summary} />
        </div>
      )}
    </div>
  )
}
