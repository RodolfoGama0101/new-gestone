'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { transactionPeriod } from '@/lib/utils/transaction-period'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'

export function TransactionFilters() {
  const { categories } = useCategories()
  const { creditCards, error: cardsError, refetch: retryCards } = useCreditCards()
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
  const [categoryId, setCategoryId] = useQueryState('categoryId', { defaultValue: '' })

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

  const typeSelectItems = React.useMemo(() => [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'income', label: 'Receitas (Entradas)' },
    { value: 'expense', label: 'Despesas (Saídas)' },
    { value: 'investment', label: 'Investimentos' },
  ], [])

  const categorySelectItems = React.useMemo(() => {
    return [
      { value: 'all', label: 'Todas as categorias' },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ]
  }, [categories])

  return (
    <div className="flex flex-col gap-6 p-6 rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="size-3.5 text-muted-foreground" />
        Filtros de Busca
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0 [&_input]:min-w-0">
        {/* Busca Textual */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar por descrição"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value || '')}
            className="pl-9 min-h-11 w-full min-w-0 text-sm rounded-md bg-background border-border"
          />
        </div>

        {/* Tipo */}
        <Select value={type || 'all'} onValueChange={handleTypeChange} items={typeSelectItems}>
          <SelectTrigger aria-label="Filtrar por tipo" className="min-h-11 w-full min-w-0 text-sm rounded-md bg-background border-border">
            <SelectValue placeholder="Tipo de lançamento" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all" className="text-xs rounded-md">Todos os tipos</SelectItem>
            <SelectItem value="income" className="text-xs rounded-md">Receitas (Entradas)</SelectItem>
            <SelectItem value="expense" className="text-xs rounded-md">Despesas (Saídas)</SelectItem>
            <SelectItem value="investment" className="text-xs rounded-md">Investimentos</SelectItem>
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={categoryId || 'all'} onValueChange={handleCategoryChange} items={categorySelectItems}>
          <SelectTrigger aria-label="Filtrar por categoria" className="min-h-11 w-full min-w-0 text-sm rounded-md bg-background border-border">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all" className="text-xs rounded-md">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id} className="text-xs rounded-md">
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">Data inicial da compra
          <Input type="date" value={start} onChange={e => setStart(e.target.value)} aria-invalid={!!period.error} aria-describedby={period.error ? 'period-error' : undefined} />
        </label>
        <label className="space-y-1 text-sm">Data final da compra
          <Input type="date" value={end} onChange={e => setEnd(e.target.value)} aria-invalid={!!period.error} aria-describedby={period.error ? 'period-error' : undefined} />
        </label>
        <label className="space-y-1 text-sm">Cartão
          <select aria-label="Cartão" className="h-11 w-full rounded-md border bg-background px-3" value={card} onChange={e => setCard(e.target.value)}>
            <option value="">Todos os cartões</option>
            {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}{c.archived ? ' (arquivado)' : ''}</option>)}
          </select>
        </label>
      </div>
      {cardsError && <p role="alert">Não foi possível carregar cartões. <Button variant="outline" onClick={() => retryCards()}>Tentar novamente</Button></p>}
      {period.error && <p id="period-error" role="alert" className="text-sm text-destructive">{period.error}</p>}
      <p className="text-sm text-muted-foreground">Período: {start || 'sem início'} a {end || 'sem fim'}. Filtro pela data da compra; a competência da fatura pode ser diferente.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => preset(0)}>Este mês</Button>
        <Button variant="outline" onClick={() => preset(1)}>Mês anterior</Button>
      </div>
      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 min-h-10 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}
