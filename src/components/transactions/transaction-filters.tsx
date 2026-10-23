'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import {
  parsePeriodDate,
  transactionPeriod,
} from '@/lib/utils/transaction-period'
import { DatePicker } from '@/components/shared/date-picker'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'

export function TransactionFilters() {
  const { categories } = useCategories()
  const {
    creditCards,
    error: cardsError,
    refetch: retryCards,
  } = useCreditCards()
  const [start, setStart] = useQueryState('startDate', { defaultValue: '' })
  const [end, setEnd] = useQueryState('endDate', { defaultValue: '' })
  const [card, setCard] = useQueryState('creditCardId', { defaultValue: '' })
  const period = transactionPeriod(start, end)
  const preset = (offset: number) => {
    const month = subMonths(new Date(), offset)
    void setStart(format(startOfMonth(month), 'yyyy-MM-dd'))
    void setEnd(format(endOfMonth(month), 'yyyy-MM-dd'))
  }

  const [search, setSearch] = useQueryState('search', { defaultValue: '' })
  const [type, setType] = useQueryState('type', { defaultValue: '' })
  const [categoryId, setCategoryId] = useQueryState('categoryId', {
    defaultValue: '',
  })

  const handleClearFilters = async () => {
    await Promise.all([setStart(''), setEnd(''), setCard('')])
    await setSearch('')
    await setType('')
    await setCategoryId('')
  }

  const hasActiveFilters = search || type || categoryId || start || end || card

  // Converte "all" para vazio para limpar o filtro na URL e no select
  const handleTypeChange = async (val: string | null) => {
    await setType(!val || val === 'all' ? '' : val)
  }

  const handleCategoryChange = async (val: string | null) => {
    await setCategoryId(!val || val === 'all' ? '' : val)
  }

  const typeSelectItems = React.useMemo(
    () => [
      { value: 'all', label: 'Todos os tipos' },
      { value: 'income', label: 'Receitas (Entradas)' },
      { value: 'expense', label: 'Despesas (Saídas)' },
      { value: 'investment', label: 'Investimentos' },
    ],
    [],
  )

  const categorySelectItems = React.useMemo(() => {
    return [
      { value: 'all', label: 'Todas as categorias' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ]
  }, [categories])

  return (
    <div className="border-border bg-card flex flex-col gap-6 rounded-md border p-6">
      <div className="text-foreground flex items-center gap-2 text-sm font-medium">
        <Filter className="text-muted-foreground size-3.5" />
        Filtros de Busca
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 [&_input]:min-w-0 [&>*]:min-w-0">
        {/* Busca Textual */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            aria-label="Buscar por descrição"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value || '')}
            className="bg-background border-border min-h-11 w-full min-w-0 rounded-md pl-9 text-sm"
          />
        </div>

        {/* Tipo */}
        <Select
          value={type || 'all'}
          onValueChange={handleTypeChange}
          items={typeSelectItems}
        >
          <SelectTrigger
            aria-label="Filtrar por tipo"
            className="bg-background border-border min-h-11 w-full min-w-0 rounded-md text-sm"
          >
            <SelectValue placeholder="Tipo de lançamento" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all" className="rounded-md text-xs">
              Todos os tipos
            </SelectItem>
            <SelectItem value="income" className="rounded-md text-xs">
              Receitas (Entradas)
            </SelectItem>
            <SelectItem value="expense" className="rounded-md text-xs">
              Despesas (Saídas)
            </SelectItem>
            <SelectItem value="investment" className="rounded-md text-xs">
              Investimentos
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select
          value={categoryId || 'all'}
          onValueChange={handleCategoryChange}
          items={categorySelectItems}
        >
          <SelectTrigger
            aria-label="Filtrar por categoria"
            className="bg-background border-border min-h-11 w-full min-w-0 rounded-md text-sm"
          >
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all" className="rounded-md text-xs">
              Todas as categorias
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem
                key={cat.id}
                value={cat.id}
                className="rounded-md text-xs"
              >
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 [&>*]:min-w-0">
        <label className="space-y-1 text-sm">
          Data inicial da compra
          <DatePicker
            aria-label="Data inicial da compra"
            date={parsePeriodDate(start)}
            setDate={(date) =>
              void setStart(date ? format(date, 'yyyy-MM-dd') : '')
            }
            dateFormat="dd/MM/yyyy"
            clearable
            aria-invalid={!!period.error}
            aria-describedby={period.error ? 'period-error' : undefined}
          />
        </label>
        <label className="space-y-1 text-sm">
          Data final da compra
          <DatePicker
            aria-label="Data final da compra"
            date={parsePeriodDate(end)}
            setDate={(date) =>
              void setEnd(date ? format(date, 'yyyy-MM-dd') : '')
            }
            dateFormat="dd/MM/yyyy"
            clearable
            aria-invalid={!!period.error}
            aria-describedby={period.error ? 'period-error' : undefined}
          />
        </label>
        <label className="space-y-1 text-sm">
          Cartão
          <Select
            value={card || 'all'}
            onValueChange={(value) =>
              void setCard(value && value !== 'all' ? value : '')
            }
            items={[
              { value: 'all', label: 'Todos os cartões' },
              ...creditCards.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.bankName}${c.archived ? ' (arquivado)' : ''}`,
              })),
            ]}
          >
            <SelectTrigger aria-label="Cartão" className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cartões</SelectItem>
              {creditCards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.bankName}
                  {c.archived ? ' (arquivado)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      {cardsError && (
        <p role="alert">
          Não foi possível carregar cartões.{' '}
          <Button variant="outline" onClick={() => retryCards()}>
            Tentar novamente
          </Button>
        </p>
      )}
      {period.error && (
        <p id="period-error" role="alert" className="text-destructive text-sm">
          {period.error}
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        Período: {start || 'sem início'} a {end || 'sem fim'}. Filtro pela data
        da compra; a competência da fatura pode ser diferente.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => preset(0)}>
          Este mês
        </Button>
        <Button variant="outline" onClick={() => preset(1)}>
          Mês anterior
        </Button>
      </div>
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-muted-foreground hover:text-foreground min-h-10 gap-2 rounded-md text-sm"
          >
            <X className="size-3" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}
