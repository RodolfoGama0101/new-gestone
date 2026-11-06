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
import { Input } from '@/components/ui/input'
import { CategoryDonutChart } from '@/components/charts/category-donut-chart'
import { AnalyticsHelper } from '@/lib/utils/analytics-helper'
import { parseFilterAmount } from '@/lib/utils/transaction-filters'
import { transactionPeriod } from '@/lib/utils/transaction-period'
import { matchesTransactionFilters } from '@/lib/utils/transaction-query'

export function CreditCardBillSummary({
  card,
  onEditTransaction,
  compact = false,
  initialMonth,
  selectedMonth,
  onMonthChange,
  onViewInvoice,
}: {
  card: CreditCard
  onEditTransaction?: (tx: Transaction) => void
  compact?: boolean
  initialMonth?: Date
  selectedMonth?: Date
  onMonthChange?: (month: Date) => void
  onViewInvoice?: (month: Date) => void
}) {
  const [localMonth, setLocalMonth] = React.useState(() =>
    startOfMonth(initialMonth ?? new Date()),
  )
  const month = selectedMonth ?? localMonth
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
  const [filters, setFilters] = React.useState({
    search: '',
    categoryId: '',
    minAmount: '',
    maxAmount: '',
    modality: '',
    dateBasis: 'competence',
    startDate: '',
    endDate: '',
  })
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }
  const [deletingTransaction, setDeletingTransaction] =
    React.useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const deletionInFlight = React.useRef(false)
  const { categories } = useCategories()
  const invoice = useCardInvoice(card, month)
  const transactions = invoice.data ?? []
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const invoiceLoading = invoice.isPending || invoice.isFetching
  const invoiceError = invoice.isError || !Number.isSafeInteger(total)
  const minAmount = parseFilterAmount(filters.minAmount)
  const maxAmount = parseFilterAmount(filters.maxAmount)
  const period = transactionPeriod(filters.startDate, filters.endDate)
  const invalid =
    !!period.error ||
    minAmount === null ||
    maxAmount === null ||
    (minAmount !== undefined &&
      minAmount !== null &&
      maxAmount !== undefined &&
      maxAmount !== null &&
      minAmount > maxAmount)
  const hasFilters = !!(
    filters.search.trim() ||
    filters.categoryId ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.modality ||
    filters.startDate ||
    filters.endDate ||
    filters.dateBasis === 'purchase'
  )
  const filteredTransactions = invalid
    ? []
    : transactions.filter((tx) =>
        matchesTransactionFilters(
          tx,
          {
            search: filters.search,
            categoryId: filters.categoryId || undefined,
            minAmount: minAmount ?? undefined,
            maxAmount: maxAmount ?? undefined,
            modality: (filters.modality || undefined) as
              'single' | 'recurring' | 'installment' | undefined,
            dateBasis:
              filters.dateBasis === 'purchase' ? 'purchase' : 'competence',
            startDate: period.startDate,
            endDate: period.endDate,
          },
          [card],
        ),
      )
  const filteredTotal = filteredTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0,
  )
  const pages = Math.max(1, Math.ceil(filteredTransactions.length / 20))
  const currentPage = Math.min(page, pages)
  const changeMonth = (offset: number) => {
    const next = addMonths(month, offset)
    if (onMonthChange) onMonthChange(next)
    else setLocalMonth(next)
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
          <CardTitle>Fatura do mês de trabalho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground text-sm capitalize">
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </p>
          {invoiceLoading ? (
            <p role="status">Carregando fatura…</p>
          ) : invoiceError ? (
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
            {invoiceLoading
              ? 'Carregando fatura…'
              : invoiceError
                ? 'Fatura indisponível'
                : payment.isPending
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
        {!invoiceLoading && !invoiceError && (
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
            {invoiceLoading
              ? 'Carregando fatura…'
              : invoiceError
                ? 'Fatura indisponível'
                : payment.isPending
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
          {!invoiceLoading &&
            !invoiceError &&
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
        {invoiceLoading ? (
          <Loader2
            className="size-6 animate-spin"
            aria-label="Carregando fatura"
          />
        ) : invoiceError ? (
          <div role="alert">
            Não foi possível carregar a fatura.{' '}
            <Button onClick={() => void invoice.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <section
              aria-label="Filtros das compras"
              className="border-border mb-6 grid min-w-0 gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0"
            >
              <h2 className="font-medium sm:col-span-2 lg:col-span-3">
                Filtrar compras da fatura
              </h2>
              <label className="grid gap-1 text-sm">
                Descrição
                <Input
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Categoria
                <select
                  className="border-input bg-background min-h-10 w-full min-w-0 rounded-md border px-3"
                  value={filters.categoryId}
                  onChange={(e) => updateFilter('categoryId', e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.archived ? ' (arquivada)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Modalidade
                <select
                  className="border-input bg-background min-h-10 w-full min-w-0 rounded-md border px-3"
                  value={filters.modality}
                  onChange={(e) => updateFilter('modality', e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="single">Avulso</option>
                  <option value="recurring">Recorrente</option>
                  <option value="installment">Parcelado</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Valor mínimo (R$)
                <Input
                  inputMode="decimal"
                  value={filters.minAmount}
                  onChange={(e) => updateFilter('minAmount', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Valor máximo (R$)
                <Input
                  inputMode="decimal"
                  value={filters.maxAmount}
                  onChange={(e) => updateFilter('maxAmount', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Critério de data
                <select
                  className="border-input bg-background min-h-10 w-full min-w-0 rounded-md border px-3"
                  value={filters.dateBasis}
                  onChange={(e) => updateFilter('dateBasis', e.target.value)}
                >
                  <option value="competence">Competência</option>
                  <option value="purchase">Data da compra</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Data inicial
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                Data final
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </label>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({
                      search: '',
                      categoryId: '',
                      minAmount: '',
                      maxAmount: '',
                      modality: '',
                      dateBasis: 'competence',
                      startDate: '',
                      endDate: '',
                    })
                    setPage(1)
                  }}
                >
                  Limpar filtros das compras
                </Button>
              )}
              {invalid ? (
                <p role="alert" className="text-destructive text-sm">
                  {period.error ||
                    'Informe valores válidos e um mínimo menor ou igual ao máximo.'}
                </p>
              ) : (
                hasFilters && (
                  <p className="text-sm">
                    Compras filtradas: {formatMoney(filteredTotal)} ·{' '}
                    {filteredTransactions.length} compras
                  </p>
                )
              )}
            </section>
            {!invalid &&
              (filteredTransactions.length === 0 ? (
                <EmptyState
                  title={
                    hasFilters
                      ? 'Nenhuma compra encontrada'
                      : 'Sem compras registradas'
                  }
                  description={
                    hasFilters
                      ? 'Nenhuma compra da fatura atende aos filtros.'
                      : 'Nenhuma compra pertence a este ciclo.'
                  }
                  icon={Receipt}
                  compact
                />
              ) : (
                <div className="border-border -mx-6 border-y">
                  <TransactionTable
                    showCardCompetence
                    creditCards={[card]}
                    transactions={filteredTransactions.slice(
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
              ))}
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
            {!invalid && filteredTransactions.length > 0 && (
              <div className="mt-6">
                <CategoryDonutChart
                  data={AnalyticsHelper.getCategoryShare(
                    filteredTransactions,
                    categories,
                    'expense',
                  )}
                />
              </div>
            )}
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
