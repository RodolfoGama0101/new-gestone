'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { transactionPeriod } from '@/lib/utils/transaction-period'
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Search, X, Filter } from 'lucide-react'

export function TransactionFilters() {
  const [expanded, setExpanded] = React.useState(false)
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

  const additionalFilters = [
    type &&
      (typeSelectItems.find((item) => item.value === type)?.label || type),
    categoryId &&
      (categories.find((item) => item.id === categoryId)?.name ||
        'Categoria selecionada'),
    card &&
      (creditCards.find((item) => item.id === card)?.name ||
        'Cartão selecionado'),
  ].filter(Boolean)

  return (
    <section
      aria-label="Filtros do extrato"
      className="bg-card space-y-4 rounded-xl border p-4 sm:p-5"
    >
      <label className="block space-y-2 text-sm font-medium">
        Buscar por descrição
        <span className="relative block">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="Buscar por descrição"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value || '')}
            className="pl-10"
          />
        </span>
      </label>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="space-y-2 text-sm">
          Data inicial da compra
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-invalid={!!period.error}
            aria-describedby={period.error ? 'period-error' : undefined}
          />
        </label>
        <label className="space-y-2 text-sm">
          Data final da compra
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={!!period.error}
            aria-describedby={period.error ? 'period-error' : undefined}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => preset(0)}>
          Este mês
        </Button>
        <Button variant="outline" onClick={() => preset(1)}>
          Mês anterior
        </Button>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Período: {start || 'sem início'} a {end || 'sem fim'}. Filtro pela data
        da compra; a competência da fatura pode ser diferente.
      </p>
      {period.error && (
        <p id="period-error" role="alert" className="text-destructive text-sm">
          {period.error}
        </p>
      )}
      <Collapsible
        open={expanded}
        onOpenChange={setExpanded}
        className="space-y-4 border-t pt-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CollapsibleTrigger
            render={<Button variant="outline" className="gap-2" />}
          >
            <Filter aria-hidden="true" className="size-4" />
            Filtros adicionais
            {additionalFilters.length > 0
              ? ' (' + additionalFilters.length + ')'
              : ''}
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              className="gap-2"
            >
              <X aria-hidden="true" className="size-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
        {additionalFilters.length > 0 && (
          <ul aria-label="Filtros ativos" className="flex flex-wrap gap-2">
            {additionalFilters.map((label, i) => (
              <li
                key={i}
                className="bg-accent text-accent-foreground max-w-full rounded-md px-3 py-1 text-xs break-words"
              >
                {label}
              </li>
            ))}
          </ul>
        )}
        <CollapsibleContent
          keepMounted
          className="grid min-w-0 gap-4 data-closed:hidden lg:grid-cols-3 [&>*]:min-w-0"
        >
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
          <label className="space-y-1 text-sm">
            Cartão
            <select
              aria-label="Cartão"
              className="bg-background h-11 w-full rounded-md border px-3"
              value={card}
              onChange={(e) => setCard(e.target.value)}
            >
              <option value="">Todos os cartões</option>
              {creditCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived ? ' (arquivado)' : ''}
                </option>
              ))}
            </select>
          </label>
        </CollapsibleContent>
      </Collapsible>
      {cardsError && (
        <p role="alert">
          Não foi possível carregar cartões.{' '}
          <Button variant="outline" onClick={() => retryCards()}>
            Tentar novamente
          </Button>
        </p>
      )}
    </section>
  )
}
