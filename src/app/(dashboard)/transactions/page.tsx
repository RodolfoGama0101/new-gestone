'use client'

import { useTransactionFilters } from '@/hooks/use-transaction-filters'
import { TransactionNavigation } from '@/components/transactions/transaction-navigation'
import { TransactionPageSummary } from '@/components/transactions/transaction-page-summary'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
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
  const { values, criteria, valid, month } = useTransactionFilters()
  const { creditCards } = useCreditCards()
  const {
    categories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories()

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
    valid,
    'ledger',
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

  return (
    <div className="space-y-8">
      <p role="status" className="sr-only">
        {transactions.length} lançamentos nesta página
      </p>
      {/* Top Header */}
      {isFetching && <p role="status">Atualizando lançamentos…</p>}
      <PageHeader
        title="Extrato"
        description="Consulte os totais e filtre os lançamentos por período."
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

      <TransactionNavigation />
      <TransactionPageSummary criteria={criteria} month={month} valid={valid} />
      {/* Painel de Filtros URL */}
      <TransactionFilters />

      {/* Lista do Extrato */}
      {!valid ? (
        <p role="alert">Corrija os filtros para consultar o extrato.</p>
      ) : error || categoriesError ? (
        <LoadError
          error={error || categoriesError}
          retry={() => Promise.all([refetch(), refetchCategories()])}
        />
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
          <div className="border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3 min-[601px]:px-5">
            <h2 className="font-semibold tracking-tight">Lançamentos do extrato</h2>
            <p className="text-muted-foreground text-xs">{transactions.length} nesta página</p>
          </div>
          <CardContent className="p-0">
            <TransactionTable
              label="Lançamentos do extrato"
              describeActions
              showCardCompetence
              creditCards={creditCards}
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
          disabled={!valid}
          filters={criteria}
          search={values.search}
        />
      </div>
      {/* A navegação permanece acessível mesmo em páginas sem correspondências. */}
      {valid && !error && (hasNextPage || hasPreviousPage) && (
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
            {values.search.trim() || transactions.length === 0
              ? 'Continuar busca'
              : 'Próximo'}
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
