'use client'

import { LoadError } from '@/components/shared/load-error'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/shared/responsive-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionRow } from '@/components/transactions/transaction-row'
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
 * - onEdit / onDelete: useCallback → referências estáveis para o React.memo do TransactionRow
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

  /** Referências estáveis para não forçar re-render dos TransactionRow memoizados */
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
    <div className="animate-in fade-in space-y-6 duration-300">
      {isFetching && <p role="status">Atualizando lançamentos…</p>}
      {/* Cabeçalho da página */}
      <p role="status" className="sr-only">
        {transactions.length} lançamentos nesta página
      </p>
      <PageHeader
        title={title}
        description={description}
        action={
          <ResponsiveDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            title={addDialogTitle}
            description={addDialogDescription}
            trigger={
              <Button className="gap-2">
                <Plus className="size-4" />
                {addButtonLabel}
              </Button>
            }
          >
            <TransactionForm
              defaultType={type}
              onSuccess={() => setIsAddOpen(false)}
            />
          </ResponsiveDialog>
        }
      />

      {/* Lista de transações */}
      {transactions.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
        />
      ) : (
        <div className="space-y-4">
          <Card className="border-border bg-card rounded-xl shadow-xs transition-all duration-200 hover:shadow-sm">
            <CardHeader className="px-5 pt-4 pb-2">
              <CardTitle className="text-sm font-semibold">
                {listTitle}
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                {listDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-border/60 divide-y px-5 pb-4">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={categoryMap.get(tx.categoryId)}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                />
              ))}
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
      <ResponsiveDialog
        open={editingTx !== null}
        onOpenChange={(open) => !open && setEditingTx(null)}
        title={editDialogTitle}
        description={editDialogDescription}
      >
        {editingTx && (
          <TransactionForm
            defaultType={editingTx.type}
            editingTransaction={editingTx}
            onSuccess={() => setEditingTx(null)}
          />
        )}
      </ResponsiveDialog>

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
