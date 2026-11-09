import { Button } from '@/components/ui/button'
import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { formatMoney } from '@/lib/utils/format-money'
import { normalizeTransactionSearch } from '@/lib/utils/transaction-search'
import { workMonthPeriod } from '@/lib/utils/work-month'
import type { GetTransactionsFilters } from '@/services/transaction.service'
import type { FinancialType } from '@/lib/utils/transaction-filters'

type Criteria = Omit<GetTransactionsFilters, 'lastVisible' | 'limitCount'>

export function hasAdditionalFilters(
  criteria: Criteria,
  month: string,
  type?: FinancialType,
) {
  const period = workMonthPeriod(month)
  return Boolean(
    criteria.type !== type ||
    criteria.categoryId ||
    criteria.creditCardId ||
    normalizeTransactionSearch(criteria.search ?? '') ||
    criteria.dateBasis !== 'competence' ||
    criteria.minAmount !== undefined ||
    criteria.maxAmount !== undefined ||
    criteria.modality ||
    criteria.startDate?.getTime() !== period.startDate.getTime() ||
    criteria.endDate?.getTime() !== period.endDate.getTime(),
  )
}

export function TransactionPageSummary({
  criteria,
  month,
  valid,
  type,
}: {
  criteria: Criteria
  month: string
  valid: boolean
  type?: FinancialType
}) {
  const monthly = useTransactionTotals({
    ...workMonthPeriod(month),
    dateBasis: 'competence',
    type,
  })
  const filtered = hasAdditionalFilters(criteria, month, type)
  const results = useTransactionTotals(criteria, filtered && valid)

  return (
    <div className="space-y-4">
      <SummarySection
        title={`Mês completo por competência — ${month}`}
        query={monthly}
        type={type}
      />
      {filtered && valid && (
        <SummarySection
          title="Totais dos resultados filtrados"
          query={results}
          type={type}
        />
      )}
    </div>
  )
}

function SummarySection({
  title,
  query,
  type,
}: {
  title: string
  query: ReturnType<typeof useTransactionTotals>
  type?: FinancialType
}) {
  const totals = query.data
  const result = totals && totals.income - totals.expense - totals.investment
  const invalidResult = result !== undefined && !Number.isSafeInteger(result)
  const isPending = query.isFetching || query.isSettling || query.isPending
  const isError = query.isError || invalidResult
  return (
    <section
      aria-label={title}
      className="border-border rounded-lg border px-4 py-4 min-[601px]:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
          {title}
        </h2>
        {!isPending && !isError && totals && (
          <p className="text-muted-foreground text-xs">
            {totals.count} {totals.count === 1 ? 'lançamento' : 'lançamentos'}
          </p>
        )}
      </div>
      {isPending ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Calculando totais…
        </p>
      ) : isError ? (
        <p role="alert" className="mt-2 text-sm">
          Não foi possível calcular os totais.{' '}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </p>
      ) : (
        totals &&
        result !== undefined && (
          <dl className="border-border mt-3 grid gap-3 border-t pt-3 [overflow-wrap:anywhere] tabular-nums min-[260px]:grid-cols-2 min-[601px]:grid-cols-4">
            {(type
              ? [{ label: 'Total', amount: totals[type] }]
              : [
                  { label: 'Receitas', amount: totals.income },
                  { label: 'Despesas', amount: totals.expense },
                  { label: 'Aportes', amount: totals.investment },
                  { label: 'Resultado', amount: result },
                ]
            ).map(({ label, amount }) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="mt-1 text-base font-medium tracking-tight">
                  {formatMoney(amount)}
                </dd>
              </div>
            ))}
          </dl>
        )
      )}
    </section>
  )
}
