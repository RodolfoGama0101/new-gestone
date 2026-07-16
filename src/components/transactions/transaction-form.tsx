'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import { transactionSchema, type TransactionInput } from '@/lib/validations/transaction.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DatePicker } from '@/components/shared/date-picker'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { Transaction } from '@/types/transaction'
import { Timestamp } from 'firebase/firestore'

interface TransactionFormProps {
  onSuccess?: () => void
  defaultType?: 'income' | 'expense'
  editingTransaction?: Transaction
}

export function TransactionForm({
  onSuccess,
  defaultType = 'expense',
  editingTransaction,
}: TransactionFormProps) {
  const { categories, isLoading: isCategoriesLoading } = useCategories()
  const { createTransaction, updateTransaction, isCreating, isUpdating } = useInfiniteQueryWrapper() 

  const isEditMode = !!editingTransaction
  const isLoading = isCreating || isUpdating

  // Função auxiliar para obter objeto Date de timestamp ou data
  const parseDate = (d: unknown): Date => {
    if (!d) return new Date()
    if (d instanceof Date) return d
    if (d instanceof Timestamp) return d.toDate()
    const record = d as { seconds?: number }
    if (record && typeof record.seconds === 'number') {
      return new Date(record.seconds * 1000)
    }
    return new Date(d as string | number)
  }

  // Prepara as tags (array para string separada por vírgulas)
  const formatTags = (tags: string[] | undefined): string => {
    if (!tags || tags.length === 0) return ''
    return tags.join(', ')
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: editingTransaction?.type ?? defaultType,
      amount: editingTransaction?.amount ?? 0,
      description: editingTransaction?.description ?? '',
      categoryId: editingTransaction?.categoryId ?? '',
      date: parseDate(editingTransaction?.date),
      tags: editingTransaction?.tags ?? [],
      notes: editingTransaction?.notes ?? '',
      recurring: editingTransaction?.recurring ?? false,
    },
  })

  const watchType = watch('type')

  // Filtra as categorias pelo tipo ativo da transação
  const filteredCategories = categories.filter(
    (c) => c.type === watchType || c.type === 'both'
  )

  const onSubmit = async (data: TransactionInput) => {
    const amountVal = typeof data.amount === 'string' ? parseInt(data.amount) : data.amount
    if (amountVal <= 0) {
      return
    }

    try {
      if (isEditMode && editingTransaction) {
        await updateTransaction({
          transactionId: editingTransaction.id,
          data: {
            type: data.type,
            amount: amountVal,
            description: data.description,
            categoryId: data.categoryId,
            date: data.date,
            tags: data.tags,
            notes: data.notes || null,
            recurring: data.recurring,
          },
        })
      } else {
        await createTransaction({
          type: data.type,
          amount: amountVal,
          description: data.description,
          categoryId: data.categoryId,
          date: data.date,
          tags: data.tags,
          notes: data.notes || null,
          recurring: data.recurring,
        })
      }
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3.5">
        {/* Seletor de Tipo (Receita / Despesa) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-semibold text-foreground">Tipo de Lançamento</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={watchType === 'income' ? 'default' : 'outline'}
              className={`w-full h-10 gap-2 cursor-pointer rounded-lg font-bold transition-all ${
                watchType === 'income' 
                  ? 'bg-income text-white hover:bg-income/90 border-transparent shadow-xs' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setValue('type', 'income')
                setValue('categoryId', '') // reseta categoria ao mudar tipo
              }}
              disabled={isLoading}
            >
              <TrendingUp className="size-4" />
              Receita
            </Button>
            <Button
              type="button"
              variant={watchType === 'expense' ? 'default' : 'outline'}
              className={`w-full h-10 gap-2 cursor-pointer rounded-lg font-bold transition-all ${
                watchType === 'expense' 
                  ? 'bg-expense text-white hover:bg-expense/90 border-transparent shadow-xs' 
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setValue('type', 'expense')
                setValue('categoryId', '')
              }}
              disabled={isLoading}
            >
              <TrendingDown className="size-4" />
              Despesa
            </Button>
          </div>
        </div>

        {/* Valor Monetário */}
        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-sm font-semibold text-foreground">Valor</Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="amount"
                value={typeof field.value === 'string' ? parseInt(field.value) : field.value}
                onChange={field.onChange}
                disabled={isLoading}
              />
            )}
          />
          {errors.amount && (
            <p className="text-xs font-medium text-destructive">{errors.amount.message}</p>
          )}
        </div>

        {/* Data */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-semibold text-foreground">Data</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="date"
                date={field.value}
                setDate={field.onChange}
                disabled={isLoading}
              />
            )}
          />
          {errors.date && (
            <p className="text-xs font-medium text-destructive">{errors.date.message}</p>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm font-semibold text-foreground">Descrição</Label>
          <Input
            id="description"
            placeholder="Ex: Aluguel, Supermercado"
            disabled={isLoading}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs font-medium text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <Label htmlFor="categoryId" className="text-sm font-semibold text-foreground">Categoria</Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading || isCategoriesLoading}
              >
                <SelectTrigger id="categoryId" className="w-full h-10 rounded-lg">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-xs font-medium text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Tags (Opcional) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tags" className="text-sm font-semibold text-foreground">Tags (separadas por vírgula)</Label>
          <Input
            id="tags"
            placeholder="Ex: essencial, compras, viagem"
            disabled={isLoading}
            onChange={(e) => {
              const val = e.target.value
              const tagsArray = val
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
              setValue('tags', tagsArray)
            }}
            defaultValue={formatTags(editingTransaction?.tags)}
          />
        </div>

        {/* Notas adicionais */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="notes" className="text-sm font-semibold text-foreground">Anotações / Notas</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Alguma observação importante sobre esta transação..."
            disabled={isLoading}
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-xs font-medium text-destructive">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <Button type="submit" className="w-full h-11 font-bold rounded-lg text-sm cursor-pointer mt-2" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Salvando...
          </>
        ) : isEditMode ? (
          'Salvar Lançamento'
        ) : (
          'Confirmar Lançamento'
        )}
      </Button>
    </form>
  )
}

// Wrapper local auxiliar para invocar useTransactions sem filtros e evitar typescript loop
function useInfiniteQueryWrapper() {
  return useTransactions()
}
