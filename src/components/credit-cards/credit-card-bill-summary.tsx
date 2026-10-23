'use client'

import { useInvoicePayment } from '@/hooks/use-invoice-payment'
import { invoiceCycle } from '@/lib/utils/invoice-cycle'
import { useCurrentDate } from '@/hooks/use-current-date'
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
  const payment = useInvoicePayment(card.id, month)
  const today = useCurrentDate()
  const cycle = invoiceCycle(card, month)
  const [paymentAction, setPaymentAction] = React.useState<'pay' | 'reverse' | null>(null)
  const paymentPending = React.useRef(false)
  const handlePayment = async () => {
    if (!paymentAction || paymentPending.current) return
    paymentPending.current = true
    try { await payment.save(paymentAction === 'pay' ? total : null); setPaymentAction(null); toast.success('Registro de quitação atualizado.') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a quitação.') }
    finally { paymentPending.current = false }
  }
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

  return <Card className="min-w-0 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-11 [&_button]:py-2">
    <CardHeader className="border-b border-border pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => changeMonth(-1)} aria-label="Fatura anterior">Anterior</Button>
        <CardTitle className="min-w-0 break-words">Fatura de {format(month, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
        <Button variant="outline" onClick={() => changeMonth(1)} aria-label="Próxima fatura">Próxima</Button>
      </div>
      <CardDescription>Fechamento dia {card.closingDay}. Total de todas as compras do ciclo.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="mb-6 space-y-4 rounded-md border border-border bg-muted p-4 text-sm">
        <p>Ciclo: {format(cycle.start, 'dd/MM/yyyy')} a {format(cycle.closing, 'dd/MM/yyyy')} · Fechamento: {format(cycle.closing, 'dd/MM/yyyy')}</p>
        <p>Vencimento: {cycle.due ? format(cycle.due, 'dd/MM/yyyy') : 'não definido — configure no cartão'}</p>
        <p>Status: {payment.isPending ? 'Carregando quitação…' : payment.error ? 'Quitação indisponível' : payment.data ? payment.data.amount === total ? 'Quitada' : 'Alterada após quitação — revise e estorne o registro' : today <= cycle.closesAt ? 'Aberta' : 'Fechada'}</p>
        <p className="text-muted-foreground">Quitação integral apenas. O registro não cria nova despesa nem altera o saldo por competência. Pagamentos parciais não estão disponíveis.</p>
        {payment.error && <Button variant="outline" onClick={() => payment.refetch()}>Tentar carregar quitação</Button>}
        {!invoice.isPending && !invoice.error && !payment.error && !payment.isPending && <Button variant="outline" disabled={payment.saving || (!payment.data && (total <= 0 || today <= cycle.closesAt))} onClick={() => setPaymentAction(payment.data ? 'reverse' : 'pay')}>{payment.data ? 'Estornar quitação' : 'Registrar pagamento integral'}</Button>}
      </div>
      {invoice.isPending ? <Loader2 className="size-6 animate-spin" aria-label="Carregando fatura" />
        : invoice.isError ? <div role="alert">Não foi possível carregar a fatura. <Button onClick={() => void invoice.refetch()}>Tentar novamente</Button></div>
          : <>
            <p className="mb-6 break-all text-2xl font-medium tracking-tight tabular-nums">Total: {formatMoney(total)} · {transactions.length} compras</p>
            {transactions.length === 0 ? <EmptyState title="Sem compras registradas" description="Nenhuma compra pertence a este ciclo." icon={Receipt} compact />
              : transactions.slice((currentPage - 1) * 20, currentPage * 20).map((tx) => <TransactionRow key={tx.id} transaction={tx} category={categories.find((category) => category.id === tx.categoryId)} onEdit={onEditTransaction ?? (() => {})} onDelete={() => setDeletingTransaction(tx)} />)}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Compras anteriores</Button>
              <span>Página {currentPage} de {pages}</span>
              <Button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Mais compras</Button>
            </div>
          </>}
    </CardContent>
    <ConfirmDialog isOpen={paymentAction !== null} onClose={() => { if (!payment.saving) setPaymentAction(null) }} onConfirm={() => void handlePayment()} title={paymentAction === 'reverse' ? 'Estornar quitação?' : 'Registrar pagamento integral?'} description={paymentAction === 'reverse' ? 'Remove somente o registro de quitação. As compras e os indicadores permanecem iguais.' : 'Confirme o pagamento externo de ' + formatMoney(total) + '. Este registro não movimenta dinheiro nem cria outra despesa.'} confirmText="Confirmar" isLoading={payment.saving} />
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
