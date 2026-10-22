'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/shared/category-badge'
import { Pencil, Trash2 } from 'lucide-react'
import type { Transaction } from '@/types/transaction'
import type { Category } from '@/types/category'
import { useCurrentDate } from '@/hooks/use-current-date'
import {
  formatTransactionAmount,
  formatTransactionDate,
  transactionPresentation,
} from '@/lib/utils/transaction-presentation'

interface TransactionRowProps {
  transaction: Transaction
  category: Category | undefined
  onEdit?: (tx: Transaction) => void
  onDelete?: (id: string) => void
  showDate?: boolean
}

export const TransactionRow = React.memo(function TransactionRow({
  transaction: tx,
  category,
  onEdit,
  onDelete,
  showDate = true,
}: TransactionRowProps) {
  const today = useCurrentDate()
  const presentation = transactionPresentation[tx.type]
  const Icon = presentation.icon

  return (
    <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${presentation.color} ${presentation.background}`}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium [overflow-wrap:anywhere] break-words">
            {tx.description}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span>{presentation.label}</span>
            {tx.installmentTotal && <span>Parcela {(tx.occurrenceIndex ?? 0) + 1}/{tx.installmentTotal}</span>}
            {tx.seriesId && !tx.installmentTotal && <span>Recorrente mensal</span>}
            {showDate && <span>{formatTransactionDate(tx.date, today)}</span>}
            {category && (
              <CategoryBadge name={category.name} color={category.color} />
            )}
          </div>
          {tx.notes && (
            <p className="text-muted-foreground text-xs [overflow-wrap:anywhere] break-words">
              {tx.notes}
            </p>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:justify-end">
        <span
          className={`text-sm font-semibold break-all tabular-nums ${presentation.color}`}
        >
          {formatTransactionAmount(tx.type, tx.amount)}
        </span>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => onEdit(tx)}
                aria-label={
                  showDate ? 'Editar lançamento' : `Editar ${tx.description}`
                }
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="hover:text-destructive size-11"
                onClick={() => onDelete(tx.id)}
                aria-label={
                  showDate ? 'Excluir lançamento' : `Excluir ${tx.description}`
                }
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
