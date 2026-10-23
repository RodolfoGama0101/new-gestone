'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
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
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionNavigation } from '@/components/transactions/transaction-navigation'
import { TransactionPageSummary } from '@/components/transactions/transaction-page-summary'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { PageHeader } from '@/components/shared/page-header'
import { Transaction } from '@/types/transaction'
import {
  Plus,
  Loader2,
  LucideIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface TransactionListProps {
  /** Tipo de transação a ser exibido e criado */
  type: 'income' | 'expense' | 'investment'
  /** Título da página */
  title: string
  /** Subtítulo da página */
  description: string
  /** Título do card com a lista */
  listTitle: string
  /** Subtítulo do card com a lista */
  listDescription: string
  /** Texto do botão de adicionar nova transação */
  addButtonLabel: string
  /** Título do dialog de criação */
  addDialogTitle: string
  /** Descrição do dialog de criação */
  addDialogDescription: string
  /** Título do dialog de edição */
  editDialogTitle: string
  /** Descrição do dialog de edição */
  editDialogDescription: string
  /** Ícone para o estado vazio */
  emptyIcon: LucideIcon
  /** Título do estado vazio */
  emptyTitle: string
  /** Descrição do estado vazio */
  emptyDescription: string
  /** Texto de confirmação de exclusão */
  deleteDescription: string
}

/**
 * Componente reutilizável que encapsula a lógica completa das páginas de
 * Receitas e Despesas. Aplica memoizações para evitar re-renders desnecessários:
 *
 * - categoryMap: useMemo → O(1) lookup em vez de O(N) a cada render
 * - onEdit / onDelete: useCallback → referências estáveis para as ações da tabela
 */
export function TransactionList({
  type,
  title,
  description,
  listTitle,
  listDescription,
  addButtonLabel,
  addDialogTitle,
  addDialogDescription,
  editDialogTitle,
  editDialogDescription,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  deleteDescription,
}: TransactionListProps) {
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
  } = useTransactions({ type })

  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  /**
   * Mapa de categorias por ID — O(1) lookup em vez de categories.find()
   * chamado N vezes dentro do map. Re-computado apenas quando categories muda.
   */
  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  )

  /** Referências estáveis para não forçar re-render dos componentes de apresentação */
  const handleEdit = React.useCallback((tx: Transaction) => {
    setEditingTx(tx)
  }, [])

  const handleDeleteRequest = React.useCallback((id: string) => {
    setDeletingId(id)
  }, [])

  const handleDeleteConfirm = React.useCallback(async () => {
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
  }, [deletingId, deleteTransaction])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
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
      {isFetching && <p role="status">Atualizando lançamentos…</p>}
      {/* Cabeçalho da página */}
      <p role="status" className="sr-only">
        {transactions.length} lançamentos nesta página
      </p>
      <PageHeader
        title={title}
        description={description}
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger
              render={
                <Button className="min-h-11 cursor-pointer gap-1.5 rounded-md text-sm">
                  <Plus className="size-3.5" />
                  {addButtonLabel}
                </Button>
              }
            />
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{addDialogTitle}</DialogTitle>
                <DialogDescription>{addDialogDescription}</DialogDescription>
              </DialogHeader>
              <TransactionForm
                defaultType={type}
                onSuccess={() => setIsAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <TransactionPageSummary transactions={transactions} type={type} />
      <TransactionNavigation />
      {/* Lista de transações */}
      {transactions.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <p className="sr-only">
              {listTitle}. {listDescription}
            </p>
            <CardContent className="p-0">
              <TransactionTable
                transactions={transactions}
                categoryMap={categoryMap}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* A navegação permanece disponível mesmo após uma página ficar vazia. */}
      {(hasNextPage || hasPreviousPage) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPreviousPage}
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
            disabled={!hasNextPage}
            onClick={goToNextPage}
            className="min-h-11 cursor-pointer gap-1.5 text-sm"
          >
            Próximo
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
            <DialogTitle>{editDialogTitle}</DialogTitle>
            <DialogDescription>{editDialogDescription}</DialogDescription>
          </DialogHeader>
          {editingTx && (
            <TransactionForm
              defaultType={type}
              editingTransaction={editingTx}
              onSuccess={() => setEditingTx(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Lançamento?"
        description={deleteDescription}
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
