'use client'

import { formatMoney } from '@/lib/utils/format-money'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/shared/category-badge'
import { Pencil, Trash2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import { Transaction } from '@/types/transaction'
import { Category } from '@/types/category'

interface TransactionRowProps {
  transaction: Transaction
  category: Category | undefined
  onEdit: (tx: Transaction) => void
  onDelete: (id: string) => void
}

/**
 * Linha individual de uma transação, memoizada com React.memo.
 * Evita re-render de toda a lista quando o estado do modal pai muda
 * (ex: abrir/fechar diálogo de edição ou exclusão).
 */
export const TransactionRow = React.memo(function TransactionRow({
  transaction: tx,
  category: cat,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const isIncome = tx.type === 'income'
  const isInvestment = tx.type === 'investment'

  const formattedDate = React.useMemo(
    () => format(parseFirestoreDate(tx.date), "dd 'de' MMMM, yyyy", { locale: ptBR }),
    [tx.date]
  )

  const formattedAmount = React.useMemo(() => {
    const sign = isIncome ? '+' : '-'
    return `${sign}${formatMoney(tx.amount)}`
  }, [tx.amount, isIncome])

  return (
    <div
      className="flex flex-col lg:flex-row lg:items-center justify-between py-2.5 px-2 gap-4 last:pb-0 first:pt-0 hover:bg-accent/40 rounded-md transition-colors -mx-2"
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm leading-relaxed break-words min-w-0 [overflow-wrap:anywhere]">
            {tx.description}
          </span>
          {cat && <CategoryBadge name={cat.name} color={cat.color} />}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="size-3" />
            {formattedDate}
          </span>
          {tx.notes && (
            <span className="break-words min-w-0 text-muted-foreground italic font-normal">
              • {tx.notes}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between lg:justify-end gap-2 min-w-0 flex-wrap">
        <span
          className={`text-sm break-all font-semibold tabular-nums ${
            isIncome
              ? 'text-green-700 dark:text-green-500'
              : isInvestment
                ? 'text-violet-700 dark:text-violet-500'
                : 'text-red-700 dark:text-red-500'
          }`}
        >
          {formattedAmount}
        </span>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            onClick={() => onEdit(tx)}
            aria-label="Editar lançamento"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
            onClick={() => onDelete(tx.id)}
            aria-label="Excluir lançamento"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
})
