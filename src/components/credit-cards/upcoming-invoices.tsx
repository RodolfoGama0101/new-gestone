'use client'

import { addMonths, format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCardInvoice } from '@/hooks/use-card-invoice'
import { useCurrentDate } from '@/hooks/use-current-date'
import { formatMoney } from '@/lib/utils/format-money'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CreditCard } from '@/types/credit-card'

function UpcomingInvoice({
  card,
  month,
  onOpen,
}: {
  card: CreditCard
  month: Date
  onOpen: (month: Date) => void
}) {
  const invoice = useCardInvoice(card, month)
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b py-4 last:border-0">
      <div>
        <p className="text-sm capitalize">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {invoice.isPending
            ? 'Carregando fatura…'
            : invoice.isError
              ? 'Não foi possível carregar a fatura.'
              : formatMoney(
                  (invoice.data ?? []).reduce(
                    (sum, item) => sum + item.amount,
                    0,
                  ),
                )}
        </p>
      </div>
      {invoice.isError ? (
        <Button variant="ghost" onClick={() => void invoice.refetch()}>
          Tentar novamente
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={() => onOpen(month)}
          aria-label={
            'Ver fatura de ' + format(month, 'MMMM yyyy', { locale: ptBR })
          }
        >
          Ver fatura
        </Button>
      )}
    </div>
  )
}

export function UpcomingInvoices({
  card,
  onOpen,
}: {
  card: CreditCard
  onOpen: (month: Date) => void
}) {
  const today = useCurrentDate()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximas faturas</CardTitle>
      </CardHeader>
      <CardContent className="py-0">
        {[1, 2].map((offset) => (
          <UpcomingInvoice
            key={offset}
            card={card}
            month={addMonths(startOfMonth(today), offset)}
            onOpen={onOpen}
          />
        ))}
      </CardContent>
    </Card>
  )
}
