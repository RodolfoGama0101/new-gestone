'use client'

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
  accentColor: 'income' | 'expense' | 'investment'
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
  accentColor,
}: TransactionRowProps) {
  const isIncome = tx.type === 'income'
  const isInvestment = tx.type === 'investment'

  const formattedDate = React.useMemo(
    () => format(parseFirestoreDate(tx.date), "dd 'de' MMMM, yyyy", { locale: ptBR }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tx.date]
  )

  const formattedAmount = React.useMemo(() => {
    const sign = isIncome ? '+' : '-'
    return `${sign}${(tx.amount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`
  }, [tx.amount, isIncome])

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 gap-4 last:pb-0 first:pt-0 hover:bg-accent/40 rounded-md transition-colors -mx-2"
    >
      <div className="space-y-0.5 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs sm:text-sm leading-none">
            {tx.description}
          </span>
          {cat && <CategoryBadge name={cat.name} color={cat.color} />}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <Calendar className="size-3" />
            {formattedDate}
          </span>
          {tx.notes && (
            <span className="truncate max-w-[200px] text-muted-foreground/80 italic font-normal">
              • {tx.notes}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
        <span
          className={`text-xs sm:text-sm font-semibold tabular-nums ${
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
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            onClick={() => onEdit(tx)}
            aria-label="Editar lançamento"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
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
