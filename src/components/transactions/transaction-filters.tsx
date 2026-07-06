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
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-muted/10">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Filter className="size-4" />
        Filtros de Busca
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Busca Textual */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value || '')}
            className="pl-9 bg-background border-border"
          />
        </div>

        {/* Tipo */}
        <Select value={type || 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Tipo de lançamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Receitas (Entradas)</SelectItem>
            <SelectItem value="expense">Despesas (Saídas)</SelectItem>
          </SelectContent>
        </Select>

        {/* Categoria */}
        <Select value={categoryId || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
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
            className="gap-1 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Limpar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}
