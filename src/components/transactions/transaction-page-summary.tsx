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
  return (
    <section
      aria-label={title}
      className="border-border rounded-md border px-6 py-5"
    >
      <h2 className="text-sm font-medium">{title}</h2>
      {query.isFetching || query.isSettling || query.isPending ? (
        <p role="status" className="text-muted-foreground mt-2 text-sm">
          Calculando totais…
        </p>
      ) : query.isError || invalidResult ? (
        <p role="alert" className="mt-2 text-sm">
          Não foi possível calcular os totais.{' '}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </p>
      ) : (
        totals && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-base font-medium [overflow-wrap:anywhere] tabular-nums">
            {type ? (
              <span>Total: {formatMoney(totals[type])}</span>
            ) : (
              <>
                <span>Receitas: {formatMoney(totals.income)}</span>
                <span>Despesas: {formatMoney(totals.expense)}</span>
                <span>Aportes: {formatMoney(totals.investment)}</span>
                <span>Resultado: {formatMoney(result!)}</span>
              </>
            )}
            <span>{totals.count} lançamentos</span>
          </div>
        )
      )}
    </section>
  )
}
