'use client'

import * as React from 'react'
import { useQueryState } from 'nuqs'
import { useCategories } from '@/hooks/use-categories'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X, Filter } from 'lucide-react'

export function TransactionFilters() {
  const { categories } = useCategories()

  const [search, setSearch] = useQueryState('search', { defaultValue: '' })
  const [type, setType] = useQueryState('type', { defaultValue: '' })
  const [categoryId, setCategoryId] = useQueryState('categoryId', { defaultValue: '' })

  const handleClearFilters = async () => {
    await setSearch('')
    await setType('')
    await setCategoryId('')
  }

  const hasActiveFilters = search || type || categoryId

  // Converte "all" para vazio para limpar o filtro na URL e no select
  const handleTypeChange = async (val: string | null) => {
    await setType(!val || val === 'all' ? '' : val)
  }

  const handleCategoryChange = async (val: string | null) => {
    await setCategoryId(!val || val === 'all' ? '' : val)
  }

  return (
    <div className="flex flex-col gap-3 p-3.5 rounded-md border border-border bg-background-200 dark:bg-card">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Filter className="size-3.5 text-muted-foreground" />
        Filtros de Busca
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Busca Textual */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value || '')}
            className="pl-9 h-9 text-xs rounded-md bg-background border-border"
          />
        </div>

        {/* Tipo */}
        <Select value={type || 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-9 text-xs rounded-md bg-background border-border">
            <SelectValue placeholder="Tipo de lançamento" />
          </SelectTrigger>
          <SelectContent className="rounded-md">
            <SelectItem value="all" className="text-xs rounded-md">Todos os tipos</SelectItem>
            <SelectItem value="income" className="text-xs rounded-md">Receitas (Entradas)</SelectItem>
            <SelectItem value="expense" className="text-xs rounded-md">Despesas (Saídas)</SelectItem>
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={categoryId || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="h-9 text-xs rounded-md bg-background border-border">
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

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="gap-1 text-[11px] h-7 rounded-md cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}
