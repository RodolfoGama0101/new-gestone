'use client'

import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { useState } from 'react'
import { Filter, X } from 'lucide-react'
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

export function TransactionFilters({
  fixedType,
  defaultPeriod: reportPeriod,
}: {
  fixedType?: FinancialType
  defaultPeriod?: { startDate: Date; endDate: Date }
}) {
  const { values, setValues, month, criteria, periodError, amountError } =
    useTransactionFilters(fixedType, reportPeriod)
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
      <SelectTrigger aria-label={label} className="w-full min-w-0">
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
      className="border-border bg-card flex min-w-0 flex-col gap-5 rounded-md border p-4 sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Filter className="text-muted-foreground size-4" aria-hidden="true" />
        Filtros de busca
      </h2>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
        <label className="space-y-1 text-sm">
          Descrição
          <Input
            aria-label="Buscar por descrição"
            placeholder="Buscar por descrição..."
            value={values.search}
            onChange={(e) => void setValues({ search: e.target.value })}
          />
        </label>
        {!fixedType && (
          <label className="space-y-1 text-sm">
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
        <label className="space-y-1 text-sm">
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
          <label className="space-y-1 text-sm">
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
        <label className="space-y-1 text-sm">
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
          <label key={key} className="space-y-1 text-sm">
            {key === 'startDate' ? 'Data inicial' : 'Data final'}{' '}
            {purchase ? 'da compra' : 'da competência'}
            <DatePicker
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
                        [key === 'startDate' ? 'endDate' : 'startDate']: format(
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
      {periodError && (
        <p id="period-error" role="alert" className="text-destructive text-sm">
          {periodError}
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        Período:{' '}
        {values.startDate || values.endDate
          ? `${values.startDate || 'sem início'} a ${values.endDate || 'sem fim'} (personalizado)`
          : reportPeriod
            ? `${format(reportPeriod.startDate, 'dd/MM/yyyy')} a ${format(reportPeriod.endDate, 'dd/MM/yyyy')}`
            : `mês de trabalho ${month}`}
        .{' '}
        {purchase
          ? 'Filtro pela data da compra.'
          : 'Filtro pela competência; a data da compra pode ser diferente.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          ['Este mês', 0],
          ['Mês anterior', 1],
        ].map(([label, offset]) => (
          <Button
            key={label}
            variant="outline"
            onClick={() => {
              const date = subMonths(new Date(), Number(offset))
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
      <details
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm font-medium">
          Filtros avançados
        </summary>
        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-3 [&>*]:min-w-0">
          {(['minAmount', 'maxAmount'] as const).map((key) => (
            <label key={key} className="space-y-1 text-sm">
              {key === 'minAmount' ? 'Valor mínimo (R$)' : 'Valor máximo (R$)'}
              <Input
                inputMode="decimal"
                value={values[key]}
                onChange={(e) => void setValues({ [key]: e.target.value })}
                aria-invalid={!!amountError}
                aria-describedby={amountError ? 'amount-error' : undefined}
                placeholder="0,00"
              />
            </label>
          ))}
          <label className="space-y-1 text-sm">
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
          className="flex flex-wrap items-center gap-2"
          aria-label="Filtros ativos"
        >
          <span className="text-muted-foreground text-sm">Filtros ativos:</span>
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
              className="h-auto min-h-9 max-w-full [overflow-wrap:anywhere] whitespace-normal"
            >
              {label}
              <X className="size-3 shrink-0" aria-hidden="true" />
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
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
        </div>
      )}
    </section>
  )
}
