'use client'

import { transactionPeriod } from '@/lib/utils/transaction-period'
import { useWorkMonth } from '@/providers/work-month-provider'
import { workMonthPeriod } from '@/lib/utils/work-month'
import { TransactionNavigation } from '@/components/transactions/transaction-navigation'
import { TransactionPageSummary } from '@/components/transactions/transaction-page-summary'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useTransactions } from '@/hooks/use-transactions'
import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { formatMoney } from '@/lib/utils/format-money'
import type { GetTransactionsFilters } from '@/services/transaction.service'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { CsvImportButton } from '@/components/transactions/csv-import-button'
import { CsvExportButton } from '@/components/transactions/csv-export-button'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Transaction } from '@/types/transaction'
import { PageHeader } from '@/components/shared/page-header'
import {
  Plus,
  Loader2,
  WalletIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export default function TransactionsPage() {
  const { month } = useWorkMonth()
  const {
    categories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories()

  // Filtros URL via nuqs
  const [search] = useQueryState('search', { defaultValue: '' })
  const [type] = useQueryState('type', { defaultValue: '' })
  const [categoryId] = useQueryState('categoryId', { defaultValue: '' })

  const [start] = useQueryState('startDate', { defaultValue: '' })
  const [end] = useQueryState('endDate', { defaultValue: '' })
  const [creditCardId] = useQueryState('creditCardId', { defaultValue: '' })
  const [dateBasis] = useQueryState('dateBasis', { defaultValue: 'competence' })
  const period = transactionPeriod(start, end)
  const periodFilters = {
    dateBasis: dateBasis === 'purchase' ? 'purchase' as const : 'competence' as const,
    startDate: start || end ? period.startDate : workMonthPeriod(month).startDate,
    endDate: start || end ? period.endDate : workMonthPeriod(month).endDate,
    creditCardId: creditCardId || undefined,
  }
  const criteria: Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'> = {
    ...periodFilters,
    search,
    type: type === 'income' || type === 'expense' || type === 'investment' ? type : undefined,
    categoryId: categoryId || undefined,
  }
  const totalsQuery = useTransactionTotals(criteria, !period.error)

  const {
    transactions,
    isLoading,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    currentPage,
    deleteTransaction,
    error,
    refetch,
    isFetching,
  } = useTransactions(
    {
      ...criteria,
      limitCount: 10,
    },
    !period.error,
  )

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Confirmação de exclusão
  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await deleteTransaction(deletingId)
      setDeletingId(null)
    } catch (error) {
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (error || categoriesError)
    return (
      <LoadError
        error={error || categoriesError}
        retry={() => Promise.all([refetch(), refetchCategories()])}
      />
    )

  return (
    <div className="space-y-8">
      <p role="status" className="sr-only">
        {transactions.length} lançamentos nesta página
      </p>
      {/* Top Header */}
      {isFetching && <p role="status">Atualizando lançamentos…</p>}
      <PageHeader
        title="Extrato"
        description="Consulte seu histórico completo de lançamentos financeiros."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" className="cursor-pointer gap-1.5">
                    <Plus className="size-4" />
                    Novo Lançamento
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[450px] md:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova receita ou despesa na sua conta.
                  </DialogDescription>
                </DialogHeader>
                <TransactionForm onSuccess={() => setIsAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {!period.error && (
        <section aria-label="Totais dos resultados filtrados" className="border-border rounded-md border px-6 py-5">
          <h2 className="text-sm font-medium">Totais dos resultados filtrados</h2>
          {totalsQuery.isFetching ? (
            <p role="status" className="text-muted-foreground mt-2 text-sm">Calculando totais…</p>
          ) : totalsQuery.isError ? (
            <p role="alert" className="mt-2 text-sm">Não foi possível calcular os totais. <Button variant="outline" size="sm" onClick={() => totalsQuery.refetch()}>Tentar novamente</Button></p>
          ) : totalsQuery.data && (
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm tabular-nums">
              <span>Receitas: {formatMoney(totalsQuery.data.income)}</span>
              <span>Despesas: {formatMoney(totalsQuery.data.expense)}</span>
              <span>Investimentos: {formatMoney(totalsQuery.data.investment)}</span>
              <span>{totalsQuery.data.count} lançamentos</span>
            </div>
          )}
        </section>
      )}
      {!period.error && (
        <TransactionPageSummary
          transactions={transactions}
          isLoading={isLoading}
        />
      )}
      <TransactionNavigation />
      {/* Painel de Filtros URL */}
      <TransactionFilters />

      {/* Lista do Extrato */}
      {period.error ? (
        <p role="alert">Corrija o período para consultar o extrato.</p>
      ) : isLoading ? (
        <div
          className="flex min-h-[280px] items-center justify-center"
          role="status"
          aria-label="Buscando lançamentos"
        >
          <Loader2 className="text-primary size-8 animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title={
            hasNextPage ? 'Continue a busca' : 'Nenhum lançamento encontrado'
          }
          description={
            hasNextPage
              ? 'Há mais lançamentos para pesquisar. Continue a busca ou ajuste os filtros.'
              : 'Nenhuma transação atende aos critérios dos filtros selecionados no momento.'
          }
          icon={WalletIcon}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <TransactionTable
              describeActions
              transactions={transactions}
              categoryMap={
                new Map(categories.map((category) => [category.id, category]))
              }
              onEdit={setEditingTx}
              onDelete={setDeletingId}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {' '}
        <CsvImportButton />
        <CsvExportButton
          disabled={!!period.error}
          filters={criteria}
          search={search}
        />
      </div>
      {/* A navegação permanece acessível mesmo em páginas sem correspondências. */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !hasPreviousPage}
            onClick={goToPreviousPage}
            className="min-h-11 cursor-pointer gap-1.5 text-sm"
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Button>
          <span className="text-muted-foreground text-xs font-medium">
            Página {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !hasNextPage}
            onClick={goToNextPage}
            className="min-h-11 cursor-pointer gap-1.5 text-sm"
          >
            {search.trim() ? 'Continuar busca' : 'Próximo'}
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog
        open={editingTx !== null}
        onOpenChange={(open) => !open && setEditingTx(null)}
      >
        <DialogContent className="sm:max-w-[450px] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
            <DialogDescription>
              Modifique as informações da transação selecionada.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <TransactionForm
              defaultType={editingTx.type}
              editingTransaction={editingTx}
              onSuccess={() => setEditingTx(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Deleção */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Lançamento?"
        description="Esta ação removerá permanentemente o lançamento selecionado e atualizará o saldo geral."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
