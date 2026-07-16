'use client'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TransactionRow } from '@/components/transactions/transaction-row'
import { PageHeader } from '@/components/shared/page-header'
import { Transaction } from '@/types/transaction'
import { Plus, Loader2, LucideIcon } from 'lucide-react'

interface TransactionListProps {
  /** Tipo de transação a ser exibido e criado */
  type: 'income' | 'expense'
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
  const { categories } = useCategories()
  const {
    transactions,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    deleteTransaction,
    error,
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
    [categories]
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
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 border border-destructive bg-destructive/10 text-destructive rounded-md text-sm space-y-2">
        <p className="font-semibold">Erro ao carregar os lançamentos:</p>
        <p className="text-xs font-mono bg-background/50 p-2.5 rounded border border-destructive/20">{error.message}</p>
        {error.message.includes('index') && (
          <p className="text-xs text-muted-foreground">
            Nota: Este erro geralmente ocorre porque o Firestore exige um índice composto para consultas filtradas e ordenadas.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho da página */}
      <PageHeader
        title={title}
        description={description}
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="h-8 text-xs rounded-md gap-1.5 cursor-pointer">
                <Plus className="size-3.5" />
                {addButtonLabel}
              </Button>
            } />
            <DialogContent className="sm:max-w-[450px] md:max-w-[600px] rounded-md">
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

      {/* Lista de transações */}
      {transactions.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
        />
      ) : (
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">{listTitle}</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">
                {listDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 px-5 pb-4">
              {transactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  category={categoryMap.get(tx.categoryId)}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                  accentColor={type}
                />
              ))}
            </CardContent>
          </Card>

          {/* Paginação — Carregar mais */}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}
                className="gap-2 cursor-pointer"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar Mais'
                )}
              </Button>
            </div>
          )}
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
