'use client'

import * as React from 'react'
import { CreditCard } from '@/types/credit-card'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { TransactionRow } from '@/components/transactions/transaction-row'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Receipt } from 'lucide-react'
import { getEffectiveDebitMonth } from '@/lib/utils/credit-card-billing'
import { parseFirestoreDate } from '@/lib/utils/parse-date'

interface CreditCardBillSummaryProps {
  card: CreditCard
  onEditTransaction?: (tx: any) => void
}

export function CreditCardBillSummary({ card, onEditTransaction }: CreditCardBillSummaryProps) {
  const { categories } = useCategories()
  const { transactions, isLoading, deleteTransaction } = useTransactions({
    creditCardId: card.id,
  })

  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  // Agrupa transações por mês de débito da fatura
  const invoiceGroups = React.useMemo(() => {
    const groups: Record<string, { total: number; transactions: any[] }> = {}

    transactions.forEach((tx) => {
      const txDate = parseFirestoreDate(tx.date)
      const { month, year } = getEffectiveDebitMonth(card.closingDay, txDate)
      
      const dateLabel = new Date(year, month, 1).toLocaleString('pt-BR', {
        month: 'long',
        year: 'numeric',
      })
      const key = `${year}-${month}`

      if (!groups[key]) {
        groups[key] = { total: 0, transactions: [] }
      }
      
      groups[key].total += tx.amount
      groups[key].transactions.push({ ...tx, dateLabel })
    })

    // Ordena grupos por data decrescente
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, value]) => ({
        key,
        monthYearLabel: value.transactions[0].dateLabel,
        total: value.total,
        transactions: value.transactions,
      }))
  }, [transactions, card.closingDay])

  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {invoiceGroups.length === 0 ? (
        <EmptyState
          title="Sem compras registradas"
          description="Nenhuma despesa foi cadastrada para este cartão de crédito."
          icon={Receipt}
          compact
        />
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {invoiceGroups.map((group) => (
            <Card key={group.key} className="border-border bg-card shadow-xs rounded-md">
              <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between border-b border-border/40">
                <div className="space-y-0.5">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                    Fatura de {group.monthYearLabel}
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground">
                    Fechamento dia {card.closingDay}
                  </CardDescription>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {formatBRL(group.total)}
                </span>
              </CardHeader>
              <CardContent className="divide-y divide-border/60 px-5 pb-2">
                {group.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    category={categoryMap.get(tx.categoryId)}
                    onEdit={onEditTransaction ? onEditTransaction : () => {}}
                    onDelete={async (id) => {
                      try {
                        await deleteTransaction(id)
                      } catch (err) {
                        console.error(err)
                      }
                    }}
                    accentColor="expense"
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
