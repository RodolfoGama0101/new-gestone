'use client'

import * as React from 'react'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Transaction } from '@/types/transaction'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'
import {
  TrendingUp, 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  Calendar
} from 'lucide-react'

export default function IncomePage() {
  const { categories } = useCategories()
  const {
    transactions,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    deleteTransaction,
  } = useTransactions({ type: 'income' })

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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-income">Receitas</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Visualize e cadastre suas fontes de receita (entradas).
          </p>
        </div>
        
        {/* Modal de Adicionar Lançamento */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 px-2.5 shadow-sm bg-income hover:bg-income/90 text-white cursor-pointer">
            <Plus className="size-4" />
            Nova Receita
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Nova Receita</DialogTitle>
              <DialogDescription>
                Adicione as informações sobre a nova entrada financeira.
              </DialogDescription>
            </DialogHeader>
            <TransactionForm defaultType="income" onSuccess={() => setIsAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Transações */}
      {transactions.length === 0 ? (
        <EmptyState
          title="Sem receitas registradas"
          description="Você ainda não cadastrou nenhuma receita. Clique no botão acima para adicionar o primeiro lançamento."
          icon={TrendingUp}
        />
      ) : (
        <div className="space-y-4">
          <Card className="shadow-sm border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Histórico de Entradas</CardTitle>
              <CardDescription>Lista cronológica de receitas cadastradas</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/40">
              {transactions.map((tx) => {
                const cat = getCategoryDetails(tx.categoryId)
                return (
                  <div 
                    key={tx.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4 last:pb-0 first:pt-0"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm sm:text-base leading-none">
                          {tx.description}
                        </span>
                        {cat && (
                          <Badge 
                            variant="secondary" 
                            className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {formatDate(tx.date)}
                        </span>
                        {tx.notes && (
                          <span className="truncate max-w-[200px] text-muted-foreground/80 italic">
                            • {tx.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                      <span className="text-base sm:text-lg font-extrabold text-income">
                        {(tx.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => setEditingTx(tx)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
            <DialogDescription>
              Modifique as informações do lançamento de receita.
            </DialogDescription>
          </DialogHeader>
          {editingTx && (
            <TransactionForm 
              defaultType="income" 
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
        description="Esta ação removerá permanentemente a receita selecionada e atualizará o saldo geral."
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
