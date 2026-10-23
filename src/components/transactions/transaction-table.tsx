'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentDate } from '@/hooks/use-current-date'
import {
  formatTransactionAmount,
  formatTransactionDate,
  transactionPresentation,
} from '@/lib/utils/transaction-presentation'
import type { Category } from '@/types/category'
import type { Transaction } from '@/types/transaction'

interface TransactionTableProps {
  transactions: Transaction[]
  categoryMap: Map<string, Category>
  showDate?: boolean
  describeActions?: boolean
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
}

/** A mesma composição de colunas do desenho, com reflow em telas estreitas. */
export function TransactionTable({
  transactions,
  categoryMap,
  showDate = true,
  describeActions = false,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const today = useCurrentDate()
  const hasActions = Boolean(onEdit || onDelete)

  return (
    <div className="transaction-table-container">
      <table className="financial-table w-full text-left text-[13px]">
        <thead>
          <tr>
            {showDate && <th scope="col">Data</th>}
            <th scope="col">Descrição</th>
            <th scope="col">Categoria</th>
            <th scope="col" className="text-right">
              Valor
            </th>
            {hasActions && (
              <th scope="col" className="text-right">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const presentation = transactionPresentation[tx.type]
            const Icon = presentation.icon
            const category = categoryMap.get(tx.categoryId)
            return (
              <tr key={tx.id}>
                {showDate && (
                  <td data-label="Data" className="text-muted-foreground">
                    {formatTransactionDate(tx.date, today)}
                  </td>
                )}
                <td data-label="Descrição">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="border-border bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <span>{tx.description}</span>
                      <p className="text-muted-foreground text-xs">
                        {presentation.label}
                        {tx.installmentTotal
                          ? ` · Parcela ${(tx.occurrenceIndex ?? 0) + 1}/${tx.installmentTotal}`
                          : tx.seriesId
                            ? ' · Recorrente mensal'
                            : ''}
                      </p>
                      {tx.notes && (
                        <p className="text-muted-foreground text-xs">
                          {tx.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label="Categoria">
                  <span className="bg-accent text-muted-foreground inline-flex max-w-full rounded-full px-2.5 py-1 text-xs [overflow-wrap:anywhere]">
                    {category?.name ?? 'Sem categoria'}
                  </span>
                </td>
                <td
                  data-label="Valor"
                  className={`text-right [overflow-wrap:anywhere] tabular-nums ${tx.type === 'income' ? 'text-income' : 'text-foreground'}`}
                >
                  {formatTransactionAmount(tx.type, tx.amount)}
                </td>
                {hasActions && (
                  <td data-label="Ações">
                    <div className="flex justify-end gap-1">
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
