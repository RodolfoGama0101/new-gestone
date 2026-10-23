'use client'

import { transactionPeriod } from '@/lib/utils/transaction-period'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { useCurrentDate } from '@/hooks/use-current-date'
import {
  transactionDateKey,
  formatTransactionDate,
} from '@/lib/utils/transaction-presentation'
import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/shared/responsive-dialog'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
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
  const period = transactionPeriod(start, end)
  const periodFilters = {
    startDate: period.startDate,
    endDate: period.endDate,
    creditCardId: creditCardId || undefined,
  }

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
      ...periodFilters,
      limitCount: 10,
      search,
      type:
        type === 'income' || type === 'expense' || type === 'investment'
          ? type
          : undefined,
      categoryId: categoryId || undefined,
    },
    !period.error,
  )

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const today = useCurrentDate()

  // Agrupa as transações
  const groupedTransactions = transactions.reduce(
    (groups: Record<string, Transaction[]>, tx) => {
      const key = transactionDateKey(tx.date)
      if (!groups[key]) groups[key] = []
      groups[key].push(tx)
      return groups
    },
    {},
  )

  // Ordena as chaves de data de forma decrescente
  const sortedDateKeys = Object.keys(groupedTransactions).sort((a, b) =>
    b.localeCompare(a),
  )

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
    <div className="space-y-6">
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
            <Popover>
              <PopoverTrigger
                render={<Button variant="outline">Importar / exportar</Button>}
              />
              <PopoverContent align="end" className="flex w-56 flex-col gap-2">
                <CsvImportButton />
                <CsvExportButton
                  disabled={!!period.error}
                  filters={{
                    ...periodFilters,
                    type:
                      type === 'income' ||
                      type === 'expense' ||
                      type === 'investment'
                        ? type
                        : undefined,
                    categoryId: categoryId || undefined,
                  }}
                  search={search}
                />
              </PopoverContent>
            </Popover>
            <ResponsiveDialog
              open={isAddOpen}
              onOpenChange={setIsAddOpen}
              title="Novo Lançamento"
              description="Adicione uma receita, despesa ou investimento."
              trigger={
                <Button className="gap-2">
                  <Plus className="size-4" />
                  Novo Lançamento
                </Button>
              }
            >
              <TransactionForm onSuccess={() => setIsAddOpen(false)} />
            </ResponsiveDialog>
          </div>
        }
      />

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
              : search || type || categoryId || start || end || creditCardId
                ? 'Ajuste os filtros ou limpe a busca para consultar outros lançamentos.'
                : 'Registre seu primeiro lançamento para começar a acompanhar suas finanças.'
          }
          icon={WalletIcon}
          action={
            <Button onClick={() => setIsAddOpen(true)}>Novo Lançamento</Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-1.5">
              {/* Cabeçalho do Dia sticky */}
              <h3 className="text-muted-foreground bg-background/85 sticky top-16 z-10 py-1.5 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
                {formatTransactionDate(new Date(dateKey + 'T00:00:00'), today)}
              </h3>

              <Card className="border-border bg-card rounded-xl shadow-xs">
                <CardContent className="divide-border/60 divide-y p-0">
                  {groupedTransactions[dateKey].map((tx) => (
                    <div key={tx.id} className="px-4">
                      <TransactionRow
                        transaction={tx}
                        category={categories.find(
                          (category) => category.id === tx.categoryId,
                        )}
                        onEdit={setEditingTx}
                        onDelete={setDeletingId}
                        showDate={false}
                      />
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
      <ResponsiveDialog
        open={editingTx !== null}
        onOpenChange={(open) => !open && setEditingTx(null)}
        title="Editar Lançamento"
        description="Atualize os dados deste lançamento."
      >
        {editingTx && (
          <TransactionForm
            defaultType={editingTx.type}
            editingTransaction={editingTx}
            onSuccess={() => setEditingTx(null)}
          />
        )}
      </ResponsiveDialog>

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
