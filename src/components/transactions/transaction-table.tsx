'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentDate } from '@/hooks/use-current-date'
import { getTransactionDate } from '@/lib/utils/transaction-date'
import { format } from 'date-fns'
import {
  formatTransactionAmount,
  formatTransactionDate,
  transactionPresentation,
} from '@/lib/utils/transaction-presentation'
import type { Category } from '@/types/category'
import type { CreditCard } from '@/types/credit-card'
import type { Transaction } from '@/types/transaction'

interface TransactionTableProps {
  transactions: Transaction[]
  categoryMap: Map<string, Category>
  label?: string
  showDate?: boolean
  describeActions?: boolean
  showCardCompetence?: boolean
  creditCards?: CreditCard[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
}

/** A mesma composição de colunas do desenho, com reflow em telas estreitas. */
export function TransactionTable({
  transactions,
  categoryMap,
  label,
  showDate = true,
  describeActions = false,
  showCardCompetence = false,
  creditCards = [],
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const today = useCurrentDate()
  const hasActions = Boolean(onEdit || onDelete)

  return (
    <div className="transaction-table-container">
      <table
        aria-label={label}
        role="table"
        className="financial-table transaction-table w-full text-left text-sm"
      >
        <thead role="rowgroup">
          <tr role="row">
            {showDate && (
              <th scope="col" className="@min-[640px]:w-[17%]">
                Data
              </th>
            )}
            <th scope="col">Descrição</th>
            <th scope="col" className="@min-[640px]:w-[20%]">
              Categoria
            </th>
            <th scope="col" className="text-right @min-[640px]:w-[18%]">
              Valor
            </th>
            {hasActions && (
              <th scope="col" className="text-right @min-[640px]:w-32">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody role="rowgroup">
          {transactions.map((tx) => {
            const presentation = transactionPresentation[tx.type]
            const Icon = presentation.icon
            const category = categoryMap.get(tx.categoryId)
            return (
              <tr key={tx.id} role="row">
                {showDate && (
                  <td
                    role="cell"
                    data-label="Data"
                    className="text-muted-foreground text-[13px] leading-5"
                  >
                    {formatTransactionDate(tx.date, today)}
                    {showCardCompetence &&
                      tx.type === 'expense' &&
                      tx.creditCardId && (
                        <p className="text-xs">
                          Compra · competência{' '}
                          {format(
                            getTransactionDate(tx, creditCards),
                            'MM/yyyy',
                          )}
                        </p>
                      )}
                  </td>
                )}
                <td role="cell" data-label="Descrição">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="bg-accent text-muted-foreground flex size-8 max-w-full shrink-0 items-center justify-center rounded-md">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <span className="font-medium">{tx.description}</span>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {presentation.label}
                        {tx.installmentTotal
                          ? ` · Parcela ${(tx.occurrenceIndex ?? 0) + 1}/${tx.installmentTotal}`
                          : tx.seriesId
                            ? ' · Recorrente mensal'
                            : ''}
                      </p>
                      {tx.notes && (
                        <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td role="cell" data-label="Categoria">
                  <span className="text-muted-foreground block max-w-full text-[13px] leading-5 [overflow-wrap:anywhere]">
                    {category?.name ?? 'Sem categoria'}
                  </span>
                </td>
                <td
                  role="cell"
                  data-label="Valor"
                  className={`font-semibold [overflow-wrap:anywhere] tabular-nums ${tx.type === 'income' ? 'text-income' : 'text-foreground'}`}
                >
                  {formatTransactionAmount(tx.type, tx.amount)}
                </td>
                {hasActions && (
                  <td role="cell" data-label="Ações">
                    <div className="flex flex-wrap justify-end gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          onClick={() => onEdit(tx)}
                          aria-label={
                            describeActions
                              ? `Editar ${tx.description}`
                              : 'Editar lançamento'
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive size-10"
                          onClick={() => onDelete(tx.id)}
                          aria-label={
                            describeActions
                              ? `Excluir ${tx.description}`
                              : 'Excluir lançamento'
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
