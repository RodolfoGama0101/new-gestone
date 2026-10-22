'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import { addMonths, startOfMonth, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CreditCard } from '@/types/credit-card'
import type { Transaction } from '@/types/transaction'
import { useCardInvoice } from '@/hooks/use-card-invoice'
import { useCategories } from '@/hooks/use-categories'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'

export function CreditCardBillSummary({ card, onEditTransaction }: { card: CreditCard; onEditTransaction?: (tx: Transaction) => void }) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))
  const [page, setPage] = React.useState(1)
  const [deletingTransaction, setDeletingTransaction] = React.useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const deletionInFlight = React.useRef(false)
  const { categories } = useCategories()
  const invoice = useCardInvoice(card, month)
  const transactions = invoice.data ?? []
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const pages = Math.max(1, Math.ceil(transactions.length / 20))
  const currentPage = Math.min(page, pages)
  const changeMonth = (offset: number) => { setMonth((value) => addMonths(value, offset)); setPage(1) }
  const closeDeletion = () => {
    if (!deletionInFlight.current) setDeletingTransaction(null)
  }
  const confirmDeletion = async () => {
    if (!deletingTransaction || deletionInFlight.current) return
    deletionInFlight.current = true
    setIsDeleting(true)
    try {
      await invoice.deleteTransaction(deletingTransaction.id)
      setDeletingTransaction(null)
      toast.success('Compra excluída com sucesso!')
    } catch {
      toast.error('Não foi possível excluir a compra. Tente novamente.')
    } finally {
      deletionInFlight.current = false
      setIsDeleting(false)
    }
  }

  return <Card>
    <CardHeader>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => changeMonth(-1)} aria-label="Fatura anterior">Anterior</Button>
        <CardTitle>Fatura de {format(month, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        <Button variant="outline" onClick={() => changeMonth(1)} aria-label="Próxima fatura">Próxima</Button>
      </div>
      <CardDescription>Fechamento dia {card.closingDay}. Total de todas as compras do ciclo.</CardDescription>
    </CardHeader>
    <CardContent>
      {invoice.isPending ? <Loader2 className="size-6 animate-spin" aria-label="Carregando fatura" />
        : invoice.isError ? <div role="alert">Não foi possível carregar a fatura. <Button onClick={() => void invoice.refetch()}>Tentar novamente</Button></div>
          : <>
            <p className="mb-3 font-semibold">Total: {formatMoney(total)} · {transactions.length} compras</p>
            {transactions.length === 0 ? <EmptyState title="Sem compras registradas" description="Nenhuma compra pertence a este ciclo." icon={Receipt} compact />
              : transactions.slice((currentPage - 1) * 20, currentPage * 20).map((tx) => <TransactionRow key={tx.id} transaction={tx} category={categories.find((category) => category.id === tx.categoryId)} onEdit={onEditTransaction ?? (() => {})} onDelete={() => setDeletingTransaction(tx)} />)}
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Compras anteriores</Button>
              <span>Página {currentPage} de {pages}</span>
              <Button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Mais compras</Button>
            </div>
          </>}
    </CardContent>
    <ConfirmDialog
      isOpen={deletingTransaction !== null}
      onClose={closeDeletion}
      onConfirm={() => void confirmDeletion()}
      title="Excluir compra?"
      description={deletingTransaction
        ? `Excluir “${deletingTransaction.description}” de ${formatMoney(deletingTransaction.amount)}? Esta ação é permanente e atualizará o total da fatura.`
        : ''}
      confirmText="Excluir"
      isDestructive
      isLoading={isDeleting}
    />
  </Card>
}
