import { formatMoney } from '@/lib/utils/format-money'
import { Skeleton } from '@/components/ui/skeleton'
import type { Transaction } from '@/types/transaction'

/** O escopo é explícito: estes totais pertencem à página, não a todo o histórico. */
export function TransactionPageSummary({
  transactions,
  type,
  isLoading = false,
}: {
  transactions: Transaction[]
  type?: Transaction['type']
  isLoading?: boolean
}) {
  const income = transactions
    .filter((item) => item.type === 'income')
    .reduce((sum, item) => sum + item.amount, 0)
  const expense = transactions
    .filter((item) => item.type !== 'income')
    .reduce((sum, item) => sum + item.amount, 0)
  const metrics = type
    ? ([
        [
          'Total nesta página',
          transactions.reduce((sum, item) => sum + item.amount, 0),
        ],
      ] as const)
    : ([
        ['Entradas nesta página', income],
        ['Saídas nesta página', expense],
        ['Saldo nesta página', income - expense],
      ] as const)
  return (
    <div className={`grid gap-4 ${type ? '' : 'xl:grid-cols-3'}`}>
      {metrics.map(([label, value]) => (
        <section
          key={label}
          aria-label={label}
          className="border-border min-w-0 rounded-md border px-6 py-5"
        >
          <h2 className="text-muted-foreground text-[13px] font-normal">
            {label}
          </h2>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-32" />
          ) : (
            <>
              <p className="mt-3 text-2xl font-medium tracking-tight [overflow-wrap:anywhere] tabular-nums">
                {formatMoney(value)}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {transactions.length} lançamentos nesta página
              </p>
            </>
          )}
        </section>
      ))}
    </div>
  )
}
