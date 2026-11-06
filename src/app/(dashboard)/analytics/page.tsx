'use client'

import { useQuery } from '@tanstack/react-query'
import { parseAsString, useQueryState } from 'nuqs'
import { format } from 'date-fns'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { useWorkMonth } from '@/providers/work-month-provider'
import { useTransactionFilters } from '@/hooks/use-transaction-filters'
import { AnalyticsDataService } from '@/services/analytics-data.service'
import {
  previousReportPeriod,
  reportDetailHref,
  reportPeriod,
} from '@/lib/utils/financial-report'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { CsvExportButton } from '@/components/transactions/csv-export-button'
import { PageHeader } from '@/components/shared/page-header'
import { LoadError } from '@/components/shared/load-error'
import { Button } from '@/components/ui/button'
import {
  ReportIndicators,
  ReportDistributions,
  ReportBudgets,
} from '@/components/analytics/financial-report'
import { CashFlowBarChart } from '@/components/charts/cash-flow-bar-chart'
import { BalanceTrendAreaChart } from '@/components/charts/balance-trend-area-chart'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const userId = user?.uid ?? ''
  const { date, month } = useWorkMonth()
  const [window, setWindow] = useQueryState(
    'reportWindow',
    parseAsString.withDefault('6'),
  )
  const months = [1, 3, 6, 12].includes(Number(window)) ? Number(window) : 6
  const defaultPeriod = reportPeriod(date, months)
  const {
    values,
    setValues,
    criteria,
    valid: filtersValid,
  } = useTransactionFilters(undefined, defaultPeriod)
  const custom = !!values.startDate || !!values.endDate
  const valid = filtersValid && !!criteria.startDate && !!criteria.endDate
  // Fallback apenas para renderizar o formulário inválido; a consulta permanece bloqueada.
  const start = criteria.startDate ?? defaultPeriod.startDate
  const end = criteria.endDate ?? defaultPeriod.endDate
  const previous = previousReportPeriod(start, end, custom ? undefined : months)
  const current = useQuery({
    queryKey: ['analyticsHistory', userId, 'report', criteria],
    queryFn: ({ signal }) =>
      AnalyticsDataService.getReport(userId, criteria, signal),
    enabled: !!userId && valid,
    staleTime: 60000,
  })
  const comparison = useQuery({
    queryKey: [
      'analyticsHistory',
      userId,
      'comparison',
      { ...criteria, ...previous },
    ],
    queryFn: ({ signal }) =>
      AnalyticsDataService.getReport(
        userId,
        { ...criteria, ...previous },
        signal,
      ),
    enabled: !!userId && valid,
    staleTime: 60000,
  })
  const detail = (overrides: Parameters<typeof reportDetailHref>[4] = {}) =>
    reportDetailHref(
      {
        ...values,
        type: criteria.type ?? '',
        creditCardId: criteria.creditCardId ?? '',
        modality: criteria.modality ?? '',
        dateBasis: criteria.dateBasis ?? 'competence',
      },
      month,
      start,
      end,
      overrides,
    )
  const range = `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`

  return (
    <div className="space-y-8 [overflow-wrap:anywhere]">
      <PageHeader
        title="Relatórios"
        description="Compare os registros financeiros e consulte os lançamentos de cada indicador."
      />
      <div
        role="group"
        aria-label="Período do relatório"
        className="flex flex-wrap gap-2"
      >
        {[1, 3, 6, 12].map((count) => (
          <Button
            key={count}
            variant={!custom && months === count ? 'default' : 'outline'}
            aria-pressed={!custom && months === count}
            onClick={() => {
              void setWindow(String(count))
              void setValues({ startDate: '', endDate: '' })
            }}
          >
            {count === 1 ? '1 mês' : `${count} meses`}
          </Button>
        ))}
        <span className="text-muted-foreground self-center text-sm">
          Personalize pelas datas nos filtros.
        </span>
      </div>
      <TransactionFilters defaultPeriod={defaultPeriod} />
      {!valid ? (
        <p role="alert">
          Informe um intervalo válido com data inicial e final para consultar e
          comparar.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {range} ·{' '}
                {criteria.dateBasis === 'purchase'
                  ? 'Data da compra'
                  : 'Competência'}
              </p>
              <p className="text-muted-foreground">
                Comparação: {format(previous.startDate, 'dd/MM/yyyy')} a{' '}
                {format(previous.endDate, 'dd/MM/yyyy')}
              </p>
            </div>
            <CsvExportButton filters={criteria} search={values.search} />
          </div>
          {current.error ? (
            <LoadError error={current.error} retry={current.refetch} />
          ) : current.data ? (
            <>
              {current.data.transactions.length === 0 && (
                <p role="status">
                  Nenhum lançamento no período e filtros selecionados.
                </p>
              )}
              {comparison.error ? (
                <section aria-label="Comparação">
                  <LoadError
                    error={comparison.error}
                    retry={comparison.refetch}
                  />
                </section>
              ) : null}
              <ReportIndicators
                selectedType={
                  criteria.type ??
                  (criteria.creditCardId || criteria.modality === 'installment'
                    ? 'expense'
                    : undefined)
                }
                totals={current.data.totals}
                previous={comparison.data?.totals}
                comparisonLoading={comparison.isLoading}
                detail={detail}
              />
              <Link
                className="text-link inline-block min-h-11 py-3 underline"
                href={detail()}
              >
                Ver todos os lançamentos do relatório
              </Link>
              <CashFlowBarChart data={current.data.monthly} />
              <BalanceTrendAreaChart data={current.data.monthly} />
              <ReportDistributions
                transactions={current.data.transactions}
                cards={current.data.cards}
                detail={detail}
                range={range}
              />
              <ReportBudgets
                monthly={current.data.monthly}
                transactions={current.data.transactions}
                start={start}
                end={end}
              />
            </>
          ) : (
            <p role="status">Carregando relatórios…</p>
          )}
        </>
      )}
    </div>
  )
}
