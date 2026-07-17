'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/shared/category-badge'
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
import { PageHeader } from '@/components/shared/page-header'
import { 
  ArrowUpRight,
  ArrowDownRight,
  Plus, 
  Loader2, 
  Pencil, 
  Trash2, 
  WalletIcon,
  ChevronLeft,
  ChevronRight
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
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    currentPage,
    deleteTransaction,
    error,
  } = useTransactions({
    type: (type === 'income' || type === 'expense' ? type : undefined),
    categoryId: (categoryId || undefined),
  })

  // Estados dos Modais
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Cache para today/yesterday formatados para evitar chamadas impuras no render
  const { today, yesterday } = React.useMemo(() => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    const yesterdayStr = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd')
    return { today: todayStr, yesterday: yesterdayStr }
  }, [])

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
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Extrato"
        description="Consulte seu histórico completo de lançamentos financeiros."
        action={
          <div className="flex items-center gap-2">
            <CsvExportButton transactions={filtered} />
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
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum lançamento encontrado"
          description="Nenhuma transação atende aos critérios dos filtros selecionados no momento."
          icon={WalletIcon}
        />
      ) : (
        <div className="space-y-5">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="space-y-1.5">
              {/* Cabeçalho do Dia sticky */}
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-[48px] bg-background/85 backdrop-blur-md py-1.5 z-10">
                {formatGroupHeader(dateKey)}
              </h3>

              <Card className="border-border bg-card shadow-xs rounded-md">
                <CardContent className="divide-y divide-border/60 p-0">
                  {groupedTransactions[dateKey].map((tx) => {
                    const cat = getCategoryDetails(tx.categoryId)
                    const isIncome = tx.type === 'income'
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-3.5 py-2.5 gap-4 hover:bg-accent/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Icon compact squared 28px */}
                          <div
                            className={`size-7 rounded-md flex items-center justify-center shrink-0 border ${
                              isIncome
                                ? 'bg-green-100 text-green-700 border-green-200/40 dark:bg-green-1000/20 dark:text-green-500 dark:border-green-800/10'
                                : 'bg-red-100 text-red-700 border-red-200/40 dark:bg-red-1000/20 dark:text-red-500 dark:border-red-800/10'
                            }`}
                          >
                            {isIncome ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-xs text-foreground leading-tight truncate">
                                {tx.description}
                              </span>
                              {cat && (
                                <CategoryBadge name={cat.name} color={cat.color} />
                              )}
                            </div>
                            {tx.notes && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                {tx.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-semibold tabular-nums ${
                            isIncome ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'
                          }`}>
                            {isIncome ? '+' : '−'}
                            {(tx.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>

                          <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                              onClick={() => setEditingTx(tx)}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive cursor-pointer rounded-md"
                              onClick={() => setDeletingId(tx.id)}
                            >
                              <Trash2 className="size-3" />
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

          {/* Paginação */}
          {(hasNextPage || hasPreviousPage) && (
            <div className="flex items-center justify-between pt-2 px-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPreviousPage}
                onClick={goToPreviousPage}
                className="gap-1.5 cursor-pointer text-xs h-8"
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
                disabled={!hasNextPage}
                onClick={goToNextPage}
                className="gap-1.5 cursor-pointer text-xs h-8"
              >
                Próximo
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          )}
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
