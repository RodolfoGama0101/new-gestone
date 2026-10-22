'use client'

import { transactionPeriod } from '@/lib/utils/transaction-period'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { useCurrentDate } from '@/hooks/use-current-date'
import { transactionDateKey, formatTransactionDate } from '@/lib/utils/transaction-presentation'
import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  ChevronRight
} from 'lucide-react'

export default function TransactionsPage() {
  const { categories, error: categoriesError, refetch: refetchCategories } = useCategories()

  // Filtros URL via nuqs
  const [search] = useQueryState('search', { defaultValue: '' })
  const [type] = useQueryState('type', { defaultValue: '' })
  const [categoryId] = useQueryState('categoryId', { defaultValue: '' })

  const [start] = useQueryState('startDate', { defaultValue: '' })
  const [end] = useQueryState('endDate', { defaultValue: '' })
  const [creditCardId] = useQueryState('creditCardId', { defaultValue: '' })
  const period = transactionPeriod(start, end)
  const periodFilters = { startDate: period.startDate, endDate: period.endDate, creditCardId: creditCardId || undefined }

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
  } = useTransactions({
    ...periodFilters,
    limitCount: 10,
    search,
    type: (type === 'income' || type === 'expense' || type === 'investment' ? type : undefined),
    categoryId: (categoryId || undefined),
  }, !period.error)

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const today = useCurrentDate()

  // Agrupa as transações
  const groupedTransactions = transactions.reduce((groups: Record<string, Transaction[]>, tx) => {
    const key = transactionDateKey(tx.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
    return groups
  }, {})

  // Ordena as chaves de data de forma decrescente
  const sortedDateKeys = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a))

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

  if (error || categoriesError) return <LoadError error={error || categoriesError} retry={() => Promise.all([refetch(), refetchCategories()])} />

  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">{transactions.length} lançamentos nesta página</p>
      {/* Top Header */}
      {isFetching && <p role="status">Atualizando lançamentos…</p>}
      <PageHeader
        title="Extrato"
        description="Consulte seu histórico completo de lançamentos financeiros."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CsvImportButton />
            <CsvExportButton
              disabled={!!period.error}
              filters={{
                ...periodFilters,
                type: type === 'income' || type === 'expense' || type === 'investment' ? type : undefined,
                categoryId: categoryId || undefined,
              }}
              search={search}
            />
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger render={
                <Button size="sm" className="gap-1.5 cursor-pointer">
                  <Plus className="size-4" />
                  Novo Lançamento
                </Button>
              } />
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

      {/* Painel de Filtros URL */}
      <TransactionFilters />

      {/* Lista do Extrato */}
      {period.error ? <p role="alert">Corrija o período para consultar o extrato.</p> : isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center" role="status" aria-label="Buscando lançamentos">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title={hasNextPage ? 'Continue a busca' : 'Nenhum lançamento encontrado'}
          description={hasNextPage
            ? 'Há mais lançamentos para pesquisar. Continue a busca ou ajuste os filtros.'
            : 'Nenhuma transação atende aos critérios dos filtros selecionados no momento.'}
          icon={WalletIcon}
        />
      ) : (
        <div className="space-y-5">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-1.5">
              {/* Cabeçalho do Dia sticky */}
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-[48px] bg-background/85 backdrop-blur-md py-1.5 z-10">
                {formatTransactionDate(new Date(dateKey + 'T00:00:00'), today)}
              </h3>

              <Card className="border-border bg-card shadow-xs rounded-md">
                <CardContent className="divide-y divide-border/60 p-0">
                  {groupedTransactions[dateKey].map((tx) => (
                    <div key={tx.id} className="px-4">
                      <TransactionRow transaction={tx} category={categories.find((category) => category.id === tx.categoryId)} onEdit={setEditingTx} onDelete={setDeletingId} showDate={false} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}

        </div>
      )}

      {/* A navegação permanece acessível mesmo em páginas sem correspondências. */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !hasPreviousPage}
            onClick={goToPreviousPage}
            className="gap-1.5 cursor-pointer text-sm min-h-11"
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            Página {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading || !hasNextPage}
            onClick={goToNextPage}
            className="gap-1.5 cursor-pointer text-sm min-h-11"
          >
            {search.trim() ? 'Continuar busca' : 'Próximo'}
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Modal de Edição */}
      <Dialog open={editingTx !== null} onOpenChange={(open) => !open && setEditingTx(null)}>
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
