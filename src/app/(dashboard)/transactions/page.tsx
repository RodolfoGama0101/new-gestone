'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { CsvExportButton } from '@/components/transactions/csv-export-button'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { Transaction } from '@/types/transaction'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Timestamp } from 'firebase/firestore'
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  WalletIcon
} from 'lucide-react'

export default function TransactionsPage() {
  const { categories } = useCategories()

  // Filtros URL via nuqs
  const [search] = useQueryState('search', { defaultValue: '' })
  const [type] = useQueryState('type', { defaultValue: '' })
  const [categoryId] = useQueryState('categoryId', { defaultValue: '' })

  const {
    transactions,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    deleteTransaction,
  } = useTransactions({
    type: (type === 'income' || type === 'expense' ? type : undefined),
    categoryId: (categoryId || undefined),
  })

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Encontra a categoria correspondente para renderização de badge
  const getCategoryDetails = (catId: string) => {
    return categories.find((c) => c.id === catId)
  }

  // Filtragem textual local por descrição
  const filtered = transactions.filter((tx) => {
    if (search && !tx.description.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    return true
  })

  // Agrupamento por data (YYYY-MM-DD)
  const formatDateKey = (dateVal: unknown): string => {
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
    return format(d, 'yyyy-MM-dd')
  }

  const formatGroupHeader = (dateKey: string): string => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
    
    if (dateKey === today) return 'Hoje'
    if (dateKey === yesterday) return 'Ontem'
    
    // Evita problema de timezones locais parseando com T00:00:00
    const parsedDate = new Date(dateKey + 'T00:00:00')
    return format(parsedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  // Agrupa as transações
  const groupedTransactions = filtered.reduce((groups: Record<string, Transaction[]>, tx) => {
    const key = formatDateKey(tx.date)
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Extrato</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Consulte seu histórico completo de lançamentos financeiros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Exportação CSV */}
          <CsvExportButton transactions={filtered} />

          {/* Modal de Adicionar Transação */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 h-8 gap-1.5 px-2.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
              <Plus className="size-4" />
              Novo Lançamento
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
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
      </div>

      {/* Painel de Filtros URL */}
      <TransactionFilters />

      {/* Lista do Extrato */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento encontrado"
          description="Nenhuma transação atende aos critérios dos filtros selecionados no momento."
          icon={WalletIcon}
        />
      ) : (
        <div className="space-y-6">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-2">
              {/* Cabeçalho do Dia */}
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background/90 backdrop-blur-xs py-1.5 z-10">
                {formatGroupHeader(dateKey)}
              </h3>

              <Card className="shadow-sm border-border bg-card">
                <CardContent className="divide-y divide-border/40 p-0">
                  {groupedTransactions[dateKey].map((tx) => {
                    const cat = getCategoryDetails(tx.categoryId)
                    const isIncome = tx.type === 'income'
                    return (
                      <div 
                        key={tx.id} 
                        className="flex items-center justify-between p-4 gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Ícone de evolução financeira */}
                          <div 
                            className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                              isIncome ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                            }`}
                          >
                            {isIncome ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm sm:text-base leading-tight truncate">
                                {tx.description}
                              </span>
                              {cat && (
                                <Badge 
                                  variant="secondary" 
                                  className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                >
                                  {cat.name}
                                </Badge>
                              )}
                            </div>
                            {tx.notes && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className={`text-sm sm:text-base font-extrabold ${
                            isIncome ? 'text-income' : 'text-expense'
                          }`}>
                            {isIncome ? '+' : '-'}
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
            </div>
          ))}

          {/* Carregar mais */}
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
