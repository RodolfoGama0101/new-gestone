'use client'

import { useQueries } from '@tanstack/react-query'
import { format } from 'date-fns'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { useCurrentDate } from '@/hooks/use-current-date'
import { useInvoicePayment } from '@/hooks/use-invoice-payment'
import { formatMoney } from '@/lib/utils/format-money'
import { invoiceCycle } from '@/lib/utils/invoice-cycle'
import { TransactionService } from '@/services/transaction.service'
import { Button } from '@/components/ui/button'
import type { CreditCard } from '@/types/credit-card'

export function CardConsolidated({
  month,
  visibleCards,
  onOpen,
  compact = false,
  filtersActive = false,
}: {
  month: Date
  visibleCards?: CreditCard[]
  onOpen?: (card: CreditCard) => void
  compact?: boolean
  filtersActive?: boolean
}) {
  const { user } = useAuth()
  const { creditCards, isLoading, error, refetch } = useCreditCards()
  const monthKey = format(month, 'yyyy-MM')
  const invoices = useQueries({
    queries: creditCards.map((card) => ({
      queryKey: [
        'transactions',
        user?.uid,
        'invoice',
        card.id,
        monthKey,
        card.closingDay,
      ],
      queryFn: ({ signal }) =>
        TransactionService.getInvoice(user!.uid, card, month, signal),
      enabled: !!user,
    })),
  })
  const waiting =
    isLoading || invoices.some((item) => item.isFetching || item.isPending)
  const failed = error || invoices.some((item) => item.isError)
  const totals = invoices.map((item) =>
    (item.data ?? []).reduce((sum, tx) => sum + tx.amount, 0),
  )
  const total = totals.reduce((sum, amount) => sum + amount, 0)
  const unsafe =
    !Number.isSafeInteger(total) ||
    totals.some((amount) => !Number.isSafeInteger(amount))
  const visibleIds = new Set(
    (visibleCards ?? creditCards).map((card) => card.id),
  )
  const visibleTotal = totals.reduce(
    (sum, amount, index) =>
      sum + (visibleIds.has(creditCards[index].id) ? amount : 0),
    0,
  )
  const isFiltered = filtersActive || visibleIds.size !== creditCards.length
  return (
    <section
      aria-label="Consolidado dos cartões"
      className={cn(
        'min-w-0',
        compact
          ? 'p-4 min-[601px]:p-5'
          : 'border-border rounded-md border p-5 sm:p-6',
      )}
    >
      <h2 className="font-medium">Gastos em cartões · {monthKey}</h2>
      {waiting ? (
        <p role="status" className="text-muted-foreground mt-3 text-sm">
          Calculando faturas…
        </p>
      ) : failed || unsafe ? (
        <div role="alert" className="mt-3 text-sm">
          Não foi possível calcular o consolidado.{' '}
          <Button
            variant="outline"
            onClick={() => {
              void refetch()
              invoices.forEach((item) => {
                if (item.isError || unsafe) void item.refetch()
              })
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground mt-3 text-sm">
            Todos os cartões do mês
          </p>
          <p className="mt-1 text-2xl font-medium [overflow-wrap:anywhere] tabular-nums">
            {formatMoney(total)}
          </p>
          {!compact && isFiltered && (
            <p className="mt-2 text-sm">
              Cartões filtrados: {formatMoney(visibleTotal)}
            </p>
          )}
          {compact ? (
            <Link
              href={`/credit-cards?month=${monthKey}`}
              className="text-link mt-2 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium underline-offset-4 hover:underline"
            >
              Ver cartões
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
            </Link>
          ) : (
            <div className="divide-border mt-4 divide-y">
              {creditCards.map(
                (card, index) =>
                  visibleIds.has(card.id) && (
                    <CardRow
                      key={card.id}
                      card={card}
                      month={month}
                      total={totals[index]}
                      onOpen={onOpen}
                    />
                  ),
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CardRow({
  card,
  month,
  total,
  onOpen,
}: {
  card: CreditCard
  month: Date
  total: number
  onOpen?: (card: CreditCard) => void
}) {
  const payment = useInvoicePayment(card.id, month)
  const now = useCurrentDate()
  const cycle = invoiceCycle(card, month)
  const status = payment.isPending
    ? 'Carregando quitação…'
    : payment.error
      ? 'Quitação indisponível'
      : payment.data
        ? payment.data.amount === total
          ? 'Quitada'
          : 'Alterada após quitação'
        : now <= cycle.closesAt
          ? 'Aberta'
          : 'Fechada'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="font-medium">
          {card.name} · {card.bankName}{' '}
          {card.archived
            ? '· Arquivado'
            : card.isActive
              ? '· Ativo'
              : '· Inativo'}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Fechamento: {format(cycle.closing, 'dd/MM/yyyy')} · Vencimento:{' '}
          {cycle.due ? format(cycle.due, 'dd/MM/yyyy') : 'Não definido'} ·{' '}
          {status}
        </p>
        {payment.error && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void payment.refetch()}
          >
            Tentar carregar quitação
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 font-medium [overflow-wrap:anywhere] tabular-nums">
          {formatMoney(total)}
        </span>
        <Button
          variant="outline"
          aria-label={`Abrir fatura de ${card.name} · ${card.bankName}`}
          onClick={() => onOpen?.(card)}
        >
          Abrir fatura
        </Button>
      </div>
    </div>
  )
}
