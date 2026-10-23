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
import { TransactionTable } from '@/components/transactions/transaction-table'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'

export function CreditCardBillSummary({
  card,
  onEditTransaction,
  compact = false,
  initialMonth,
  onViewInvoice,
}: {
  card: CreditCard
  onEditTransaction?: (tx: Transaction) => void
  compact?: boolean
  initialMonth?: Date
  onViewInvoice?: (month: Date) => void
}) {
  const [month, setMonth] = React.useState(() =>
    startOfMonth(initialMonth ?? new Date()),
  )
  const payment = useInvoicePayment(card.id, month)
  const today = useCurrentDate()
  const cycle = invoiceCycle(card, month)
  const [paymentAction, setPaymentAction] = React.useState<
    'pay' | 'reverse' | null
  >(null)
  const paymentPending = React.useRef(false)
  const handlePayment = async () => {
    if (!paymentAction || paymentPending.current) return
    paymentPending.current = true
    try {
      await payment.save(paymentAction === 'pay' ? total : null)
      setPaymentAction(null)
      toast.success('Registro de quitação atualizado.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível atualizar a quitação.',
      )
    } finally {
      paymentPending.current = false
    }
  }
  const [page, setPage] = React.useState(1)
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const deletionInFlight = React.useRef(false)
  const { categories } = useCategories()
  const invoice = useCardInvoice(card, month)
  const transactions = invoice.data ?? []
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const pages = Math.max(1, Math.ceil(transactions.length / 20))
  const currentPage = Math.min(page, pages)
  const changeMonth = (offset: number) => {
    setMonth((value) => addMonths(value, offset))
    setPage(1)
  }
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

  if (compact)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fatura atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm capitalize">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </p>
          {invoice.isPending ? (
            <p role="status">Carregando fatura…</p>
          ) : invoice.isError ? (
            <div role="alert">
              Não foi possível carregar a fatura.{' '}
              <Button variant="outline" onClick={() => void invoice.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <p className="text-3xl font-medium tracking-tight tabular-nums">
              {formatMoney(total)}
            </p>
          )}
          <span className="bg-accent text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs">
            {payment.isPending
              ? 'Carregando quitação…'
              : payment.error
                ? 'Quitação indisponível'
                : payment.data
                  ? payment.data.amount === total
                    ? 'Quitada'
                    : 'Alterada após quitação'
                  : today <= cycle.closesAt
                    ? 'Em aberto'
                    : 'Fechada'}
          </span>
          <div className="border-border flex flex-wrap justify-between gap-3 border-t pt-4 text-sm">
            <span className="text-muted-foreground">Vencimento</span>
            <span>
              {cycle.due ? format(cycle.due, 'dd/MM/yyyy') : 'Não definido'}
            </span>
          </div>
          <Button onClick={() => onViewInvoice?.(month)}>Ver fatura</Button>
        </CardContent>
      </Card>
    )

  return (
    <Card className="min-w-0 [&_button]:h-auto [&_button]:min-h-11 [&_button]:max-w-full [&_button]:py-2 [&_button]:whitespace-normal">
      <CardHeader className="border-border border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => changeMonth(-1)}
            aria-label="Fatura anterior"
          >
            Anterior
          </Button>
          <CardTitle className="min-w-0 break-words">
            Fatura de {format(month, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <Button
            variant="outline"
            onClick={() => changeMonth(1)}
            aria-label="Próxima fatura"
          >
            Próxima
          </Button>
        </div>
        <CardDescription>
          Fechamento dia {card.closingDay}. Total de todas as compras do ciclo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!invoice.isPending && !invoice.isError && (
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="border-border rounded-md border p-5">
              <p className="text-muted-foreground mb-3 text-xs">
                Total da fatura
              </p>
              <p className="text-2xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
                Total: {formatMoney(total)} · {transactions.length} compras
              </p>
            </div>
            <div className="border-border rounded-md border p-5">
              <p className="text-muted-foreground mb-3 text-xs">
                Valor pago registrado
              </p>
              <p className="text-2xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
                {payment.isPending
                  ? 'Carregando…'
                  : payment.error
                    ? 'Indisponível'
                    : formatMoney(payment.data?.amount ?? 0)}
              </p>
            </div>
            <div className="border-border rounded-md border p-5">
              <p className="text-muted-foreground mb-3 text-xs">
                Saldo a pagar
              </p>
              <p className="text-2xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
                {payment.isPending
                  ? 'Carregando…'
                  : payment.error
                    ? 'Indisponível'
                    : payment.data && payment.data.amount !== total
                      ? 'Revisar quitação'
                      : formatMoney(payment.data ? 0 : total)}
              </p>
            </div>
          </div>
        )}
        <div className="border-border mb-6 space-y-4 border-b pb-6 text-[13px]">
          <p>
            Ciclo: {format(cycle.start, 'dd/MM/yyyy')} a{' '}
            {format(cycle.closing, 'dd/MM/yyyy')} · Fechamento:{' '}
            {format(cycle.closing, 'dd/MM/yyyy')}
          </p>
          <p>
            Vencimento:{' '}
            {cycle.due
              ? format(cycle.due, 'dd/MM/yyyy')
              : 'não definido — configure no cartão'}
          </p>
          <p>
            Status:{' '}
            {payment.isPending
              ? 'Carregando quitação…'
              : payment.error
                ? 'Quitação indisponível'
                : payment.data
                  ? payment.data.amount === total
                    ? 'Quitada'
                    : 'Alterada após quitação — revise e estorne o registro'
                  : today <= cycle.closesAt
                    ? 'Aberta'
                    : 'Fechada'}
          </p>
          <p className="text-muted-foreground">
            Quitação integral apenas. O registro não cria nova despesa nem
            altera o saldo por competência. Pagamentos parciais não estão
            disponíveis.
          </p>
          {payment.error && (
            <Button variant="outline" onClick={() => payment.refetch()}>
              Tentar carregar quitação
            </Button>
          )}
          {!invoice.isPending &&
            !invoice.error &&
            !payment.error &&
            !payment.isPending && (
              <Button
                variant="outline"
                disabled={
                  payment.saving ||
                  (!payment.data && (total <= 0 || today <= cycle.closesAt))
                }
                onClick={() =>
                  setPaymentAction(payment.data ? 'reverse' : 'pay')
                }
              >
                {payment.data
                  ? 'Estornar quitação'
                  : 'Registrar pagamento integral'}
              </Button>
            )}
        </div>
        {invoice.isPending ? (
          <Loader2
            className="size-6 animate-spin"
            aria-label="Carregando fatura"
          />
        ) : invoice.isError ? (
          <div role="alert">
            Não foi possível carregar a fatura.{' '}
            <Button onClick={() => void invoice.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {transactions.length === 0 ? (
              <EmptyState
                title="Sem compras registradas"
                description="Nenhuma compra pertence a este ciclo."
                icon={Receipt}
                compact
              />
            ) : (
              <div className="border-border -mx-6 border-y">
                <TransactionTable
                  transactions={transactions.slice(
                    (currentPage - 1) * 20,
                    currentPage * 20,
                  )}
                  categoryMap={
                    new Map(
                      categories.map((category) => [category.id, category]),
                    )
                  }
                  onEdit={onEditTransaction}
                  onDelete={(id) =>
                    setDeletingTransaction(
                      transactions.find((tx) => tx.id === id) ?? null,
                    )
                  }
                />
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <Button
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Compras anteriores
              </Button>
              <span>
                Página {currentPage} de {pages}
              </span>
              <Button
                disabled={currentPage === pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Mais compras
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <ConfirmDialog
        isOpen={paymentAction !== null}
        onClose={() => {
          if (!payment.saving) setPaymentAction(null)
        }}
        onConfirm={() => void handlePayment()}
        title={
          paymentAction === 'reverse'
            ? 'Estornar quitação?'
            : 'Registrar pagamento integral?'
        }
        description={
          paymentAction === 'reverse'
            ? 'Remove somente o registro de quitação. As compras e os indicadores permanecem iguais.'
            : 'Confirme o pagamento externo de ' +
              formatMoney(total) +
              '. Este registro não movimenta dinheiro nem cria outra despesa.'
        }
        confirmText="Confirmar"
        isLoading={payment.saving}
      />
      <ConfirmDialog
        isOpen={deletingTransaction !== null}
        onClose={closeDeletion}
        onConfirm={() => void confirmDeletion()}
        title="Excluir compra?"
        description={
          deletingTransaction
            ? `Excluir “${deletingTransaction.description}” de ${formatMoney(deletingTransaction.amount)}? Esta ação é permanente e atualizará o total da fatura.`
            : ''
        }
        confirmText="Excluir"
        isDestructive
        isLoading={isDeleting}
      />
    </Card>
  )
}
