'use client'

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { useId, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/shared/date-picker'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { useTransactionFilters } from '@/hooks/use-transaction-filters'
import { parsePeriodDate } from '@/lib/utils/transaction-period'
import { workMonthPeriod } from '@/lib/utils/work-month'
import type { FinancialType } from '@/lib/utils/transaction-filters'

const filterFields =
  'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] items-end gap-3'
const filterLabel = 'grid min-w-0 gap-1.5 text-sm font-medium'
const filterControl = 'h-11 w-full min-w-0 rounded-md font-normal'

export function TransactionFilters({
  fixedType,
  defaultPeriod: reportPeriod,
}: {
  fixedType?: FinancialType
  defaultPeriod?: { startDate: Date; endDate: Date }
}) {
  const { values, setValues, month, criteria, periodError, amountError } =
    useTransactionFilters(fixedType, reportPeriod)
  const panelId = useId()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(
    () => !!values.minAmount || !!values.maxAmount || !!values.modality,
  )
  const {
    categories,
    error: categoriesError,
    refetch: retryCategories,
  } = useCategories()
  const {
    creditCards,
    error: cardsError,
    refetch: retryCards,
  } = useCreditCards()
  const supportsCard = !criteria.type || criteria.type === 'expense'
  const purchase = criteria.dateBasis === 'purchase'
  const defaultPeriod = reportPeriod ?? workMonthPeriod(month)
  const options = (
    items: { value: string; label: string }[],
    value: string,
    label: string,
    onChange: (value: string) => void,
  ) => (
    <Select
      value={value || 'all'}
      onValueChange={(v) => onChange(v === 'all' || !v ? '' : v)}
      items={items}
    >
      <SelectTrigger aria-label={label} className={filterControl}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const active = [
    {
      key: 'search' as const,
      label: `Busca: ${values.search}`,
      show: !!values.search,
    },
    {
      key: 'type' as const,
      label: `Tipo: ${criteria.type ? { income: 'Receita', expense: 'Despesa', investment: 'Investimento' }[criteria.type] : values.type}`,
      show: !fixedType && !!values.type,
    },
    {
      key: 'categoryId' as const,
      label: `Categoria: ${categories.find((c) => c.id === values.categoryId)?.name ?? values.categoryId}`,
      show: !!values.categoryId,
    },
    {
      key: 'creditCardId' as const,
      label: `Cartão: ${creditCards.find((c) => c.id === values.creditCardId)?.name ?? values.creditCardId}`,
      show: supportsCard && !!values.creditCardId,
    },
    {
      key: 'startDate' as const,
      label: `Início: ${values.startDate}`,
      show: !!values.startDate,
    },
    {
      key: 'endDate' as const,
      label: `Fim: ${values.endDate}`,
      show: !!values.endDate,
    },
    { key: 'dateBasis' as const, label: 'Data da compra', show: purchase },
    {
      key: 'minAmount' as const,
      label: `Mínimo: ${values.minAmount}`,
      show: !!values.minAmount,
    },
    {
      key: 'maxAmount' as const,
      label: `Máximo: ${values.maxAmount}`,
      show: !!values.maxAmount,
    },
    {
      key: 'modality' as const,
      label: `Modalidade: ${{ single: 'Avulso', recurring: 'Recorrente', installment: 'Parcelado' }[values.modality] ?? values.modality}`,
      show: !!criteria.modality,
    },
  ].filter((item) => item.show)

  return (
    <section
      aria-label="Filtros de busca"
      className="border-border bg-card min-w-0 rounded-lg border"
    >
      <div className="bg-muted flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-4 py-2 min-[601px]:px-5">
        <h2 className="min-w-0">
          <Button
            type="button"
            variant="ghost"
            aria-expanded={filtersOpen}
            aria-controls={panelId}
            onClick={() => setFiltersOpen((open) => !open)}
            className="group h-auto min-h-11 max-w-full flex-wrap gap-2.5 px-2 text-left text-base font-semibold whitespace-normal"
          >
            <SlidersHorizontal
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
            Filtros de busca
            {active.length > 0 && (
              <span className="bg-chart-soft text-link rounded-full px-2 py-0.5 text-xs">
                {active.length}
                <span className="sr-only">
                  {' '}
                  {active.length === 1 ? 'filtro ativo' : 'filtros ativos'}
                </span>
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0 transition-transform group-aria-expanded:rotate-180"
            />
          </Button>
        </h2>
        {active.length > 0 && (
          <Button
            variant="ghost"
            className="text-link h-11"
            onClick={() =>
              void setValues({
                search: '',
                type: '',
                categoryId: '',
                creditCardId: '',
                startDate: '',
                endDate: '',
                dateBasis: 'competence',
                minAmount: '',
                maxAmount: '',
                modality: '',
              })
            }
          >
            Limpar filtros
          </Button>
        )}
      </div>
      <div
        id={panelId}
        hidden={!filtersOpen}
        className="border-border space-y-5 border-t p-4 min-[601px]:p-5"
      >
        <fieldset className="@container min-w-0">
          <legend className="text-muted-foreground mb-3 text-xs font-medium">
            Lançamentos
          </legend>
          <div className={filterFields}>
            <label className={`${filterLabel} @max-[34rem]:col-span-full`}>
              Descrição
              <span className="relative block">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  aria-label="Buscar por descrição"
                  placeholder="Buscar lançamento"
                  className={`${filterControl} pl-9`}
                  value={values.search}
                  onChange={(e) => void setValues({ search: e.target.value })}
                />
              </span>
            </label>
            {!fixedType && (
              <label className={filterLabel}>
                Tipo
                {options(
                  [
                    { value: 'all', label: 'Todos os tipos' },
                    { value: 'income', label: 'Receitas (Entradas)' },
                    { value: 'expense', label: 'Despesas (Saídas)' },
                    { value: 'investment', label: 'Investimentos' },
                  ],
                  values.type,
                  'Filtrar por tipo',
                  (type) =>
                    void setValues({
                      type,
                      ...(type &&
                      categories.some(
                        (category) =>
                          category.id === values.categoryId &&
                          category.type !== type &&
                          category.type !== 'both',
                      )
                        ? { categoryId: '' }
                        : {}),
                      ...(type && type !== 'expense'
                        ? {
                            creditCardId: '',
                            ...(values.modality === 'installment'
                              ? { modality: '' }
                              : {}),
                          }
                        : {}),
                    }),
                )}
              </label>
            )}
            <label className={filterLabel}>
              Categoria
              {options(
                [
                  { value: 'all', label: 'Todas as categorias' },
                  ...categories.map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.archived ? ' (arquivada)' : ''}`,
                  })),
                ],
                values.categoryId,
                'Filtrar por categoria',
                (categoryId) => void setValues({ categoryId }),
              )}
            </label>
            {supportsCard && (
              <label className={filterLabel}>
                Cartão
                {options(
                  [
                    { value: 'all', label: 'Todos os cartões' },
                    ...creditCards.map((c) => ({
                      value: c.id,
                      label: `${c.name} · ${c.bankName}${c.archived ? ' (arquivado)' : ''}`,
                    })),
                  ],
                  values.creditCardId,
                  'Cartão',
                  (creditCardId) => void setValues({ creditCardId }),
                )}
              </label>
            )}
          </div>
        </fieldset>
        <fieldset className="@container min-w-0">
          <legend className="text-muted-foreground mb-3 text-xs font-medium">
            Período
          </legend>
          <div className="grid min-w-0 items-end gap-3 @min-[15rem]:grid-cols-2 @min-[30rem]:grid-cols-3">
            <label
              className={`${filterLabel} @min-[15rem]:col-span-2 @min-[30rem]:col-span-1`}
            >
              Critério de data
              {options(
                [
                  { value: 'competence', label: 'Competência' },
                  { value: 'purchase', label: 'Data da compra' },
                ],
                criteria.dateBasis ?? 'competence',
                'Critério de data',
                (dateBasis) =>
                  void setValues({ dateBasis: dateBasis || 'competence' }),
              )}
            </label>
            {(['startDate', 'endDate'] as const).map((key) => (
              <label key={key} className={filterLabel}>
                {key === 'startDate' ? 'Data inicial' : 'Data final'}
                <DatePicker
                  className={`border-input aria-invalid:border-destructive px-2 [&_svg]:mr-0 ${filterControl}`}
                  aria-label={`${key === 'startDate' ? 'Data inicial' : 'Data final'} ${purchase ? 'da compra' : 'da competência'}`}
                  date={
                    values.startDate || values.endDate
                      ? parsePeriodDate(values[key])
                      : defaultPeriod[key]
                  }
                  setDate={(date) =>
                    void setValues({
                      ...(!values.startDate && !values.endDate
                        ? {
                            [key === 'startDate' ? 'endDate' : 'startDate']:
                              format(
                                defaultPeriod[
                                  key === 'startDate' ? 'endDate' : 'startDate'
                                ],
                                'yyyy-MM-dd',
                              ),
                          }
                        : {}),
                      [key]: date ? format(date, 'yyyy-MM-dd') : '',
                    })
                  }
                  dateFormat="dd/MM/yyyy"
                  clearable
                  aria-invalid={!!periodError}
                  aria-describedby={periodError ? 'period-error' : undefined}
                />
              </label>
            ))}
          </div>
          {periodError && (
            <p
              id="period-error"
              role="alert"
              className="text-destructive mt-3 text-sm"
            >
              {periodError}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-muted-foreground text-sm [overflow-wrap:anywhere]">
              {values.startDate || values.endDate
                ? 'Intervalo personalizado'
                : reportPeriod
                  ? `${format(reportPeriod.startDate, 'dd/MM/yyyy')} a ${format(reportPeriod.endDate, 'dd/MM/yyyy')}`
                  : `Mês de trabalho · ${month}`}
              {' · '}
              {purchase ? 'Data da compra' : 'Competência'}
            </p>
            <div
              className="flex min-w-0 flex-wrap gap-2"
              role="group"
              aria-label="Atalhos de período"
            >
              {[
                { label: 'Este mês', offset: 0 },
                { label: 'Mês anterior', offset: 1 },
              ].map(({ label, offset }) => (
                <Button
                  key={label}
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    const date = subMonths(new Date(), offset)
                    void setValues({
                      startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
                      endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
                    })
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </fieldset>
        {categoriesError && (
          <p role="alert">
            Não foi possível carregar categorias.{' '}
            <Button variant="outline" onClick={() => retryCategories()}>
              Tentar novamente
            </Button>
          </p>
        )}
        {supportsCard && cardsError && (
          <p role="alert">
            Não foi possível carregar cartões.{' '}
            <Button variant="outline" onClick={() => retryCards()}>
              Tentar novamente
            </Button>
          </p>
        )}
        <details
          className="group border-border border-t pt-2"
          open={advancedOpen}
          onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        >
          <summary className="hover:bg-muted flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Filtros avançados
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <div className={`mt-3 ${filterFields}`}>
            {(['minAmount', 'maxAmount'] as const).map((key) => (
              <label key={key} className={filterLabel}>
                {key === 'minAmount'
                  ? 'Valor mínimo (R$)'
                  : 'Valor máximo (R$)'}
                <Input
                  inputMode="decimal"
                  className={filterControl}
                  value={values[key]}
                  onChange={(e) => void setValues({ [key]: e.target.value })}
                  aria-invalid={!!amountError}
                  aria-describedby={amountError ? 'amount-error' : undefined}
                  placeholder="0,00"
                />
              </label>
            ))}
            <label className={filterLabel}>
              Modalidade
              {options(
                [
                  { value: 'all', label: 'Todas as modalidades' },
                  { value: 'single', label: 'Avulso' },
                  { value: 'recurring', label: 'Recorrente' },
                  ...(supportsCard
                    ? [{ value: 'installment', label: 'Parcelado' }]
                    : []),
                ],
                criteria.modality ?? '',
                'Modalidade',
                (modality) => void setValues({ modality }),
              )}
            </label>
          </div>
          {amountError && (
            <p
              id="amount-error"
              role="alert"
              className="text-destructive mt-2 text-sm"
            >
              {amountError}
            </p>
          )}
        </details>
        {active.length > 0 && (
          <div
            className="border-border flex flex-wrap items-center gap-2 border-t pt-4"
            role="group"
            aria-label="Filtros ativos"
          >
            <span className="text-muted-foreground w-full text-xs font-medium">
              Filtros ativos
            </span>
            {active.map(({ key, label }) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() =>
                  void setValues({
                    [key]: key === 'dateBasis' ? 'competence' : '',
                  })
                }
                aria-label={`Remover ${label}`}
                className="bg-chart-soft text-link h-auto min-h-11 max-w-full rounded-md px-2.5 text-left [overflow-wrap:anywhere] whitespace-normal"
              >
                {label}
                <X className="size-3 shrink-0" aria-hidden="true" />
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
