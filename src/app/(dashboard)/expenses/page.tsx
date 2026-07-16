'use client'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/shared/category-badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Transaction } from '@/types/transaction'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'
import { PageHeader } from '@/components/shared/page-header'
import { 
  ArrowDownRight,
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  Calendar
} from 'lucide-react'

export default function ExpensesPage() {
  const { categories } = useCategories()
  const {
    transactions,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    deleteTransaction,
  } = useTransactions({ type: 'expense' })

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Encontra a categoria correspondente para renderização de badge
  const getCategoryDetails = (catId: string) => {
    return categories.find((c) => c.id === catId)
  }

  // Formatador de data
  const formatDate = (dateVal: unknown) => {
    if (!dateVal) return ''
    let d: Date
    if (dateVal instanceof Date) d = dateVal
    else if (dateVal instanceof Timestamp) d = dateVal.toDate()
    else {
      const record = dateVal as { seconds?: number }
      if (record && typeof record.seconds === 'number') {
        d = new Date(record.seconds * 1000)
      } else {
        d = new Date(dateVal as string | number)
      }
    }
    
    return format(d, "dd 'de' MMMM, yyyy", { locale: ptBR })
  }

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <PageHeader
        title="Despesas"
        description="Visualize e cadastre seus gastos (saídas financeiras)."
        action={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="h-8 text-xs rounded-md gap-1.5 cursor-pointer">
                <Plus className="size-3.5" />
                Nova Despesa
              </Button>
            } />
            <DialogContent className="sm:max-w-[450px] md:max-w-[600px] rounded-md">
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription>
                  Adicione as informações sobre a nova saída financeira.
                </DialogDescription>
              </DialogHeader>
              <TransactionForm defaultType="expense" onSuccess={() => setIsAddOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Lista de Transações */}
      {transactions.length === 0 ? (
        <EmptyState
          title="Sem despesas registradas"
          description="Você ainda não cadastrou nenhuma despesa. Clique no botão acima para adicionar o primeiro gasto."
          icon={ArrowDownRight}
        />
      ) : (
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-xs hover:shadow-sm transition-all duration-200 rounded-md">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Histórico de Saídas</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">Lista cronológica de despesas cadastradas</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 px-5 pb-4">
              {transactions.map((tx) => {
                const cat = getCategoryDetails(tx.categoryId)
                return (
                  <div 
                    key={tx.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 gap-4 last:pb-0 first:pt-0 hover:bg-accent/40 rounded-md transition-colors -mx-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm leading-none">
                          {tx.description}
                        </span>
                        {cat && (
                          <CategoryBadge name={cat.name} color={cat.color} />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="size-3" />
                          {formatDate(tx.date)}
                        </span>
                        {tx.notes && (
                          <span className="truncate max-w-[200px] text-muted-foreground/80 italic font-normal">
                            • {tx.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                      <span className="text-xs sm:text-sm font-semibold text-red-700 dark:text-red-500">
                        -{(tx.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      <div className="flex items-center gap-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                          onClick={() => setEditingTx(tx)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                          onClick={() => setDeletingId(tx.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Botão de Paginação (Carregar mais) */}
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
      <Dialog open={editingTx !== null} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="sm:max-w-[450px] md:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
            <DialogDescription>
              Modifique as informações do lançamento de despesa.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <TransactionForm 
              defaultType="expense" 
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
        description="Esta ação removerá permanentemente a despesa selecionada e atualizará o saldo geral."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
