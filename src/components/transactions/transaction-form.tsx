'use client'

import { fieldErrorProps } from '@/lib/utils/form-accessibility'

import * as React from 'react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { LoadError } from '@/components/shared/load-error'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/hooks/use-categories'
import { useCreditCards } from '@/hooks/use-credit-cards'
import { useAuth } from '@/contexts/auth-context'
import { TransactionSeriesService } from '@/services/transaction-series.service'
import { parsePeriodDate } from '@/lib/utils/transaction-period'
import { TransactionService } from '@/services/transaction.service'
import {
  transactionSchema,
  type TransactionInput,
} from '@/lib/validations/transaction.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/shared/currency-input'
import { DatePicker } from '@/components/shared/date-picker'
import { Loader2, TrendingUp, TrendingDown, Coins } from 'lucide-react'
import { Transaction } from '@/types/transaction'
import { parseFirestoreDate } from '@/lib/utils/parse-date'
import { toast } from 'sonner'
import { invalidateTransactionData } from '@/lib/transaction-cache'

interface TransactionFormProps {
  onSuccess?: () => void
  defaultType?: 'income' | 'expense' | 'investment'
  editingTransaction?: Transaction
}

export function TransactionForm({
  onSuccess,
  defaultType = 'expense',
  editingTransaction,
}: TransactionFormProps) {
  const { user } = useAuth()
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const submitPending = React.useRef(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''
  const {
    categories,
    error: categoriesError,
    refetch: refetchCategories,
    isLoading: isCategoriesLoading,
  } = useCategories()
  const {
    creditCards,
    error: cardsError,
    refetch: refetchCards,
  } = useCreditCards()

  const isEditMode = !!editingTransaction

  const [schedule, setSchedule] = React.useState('single')
  const [installments, setInstallments] = React.useState('3')
  const [endDate, setEndDate] = React.useState('')
  const seriesRequest = React.useRef('')

  // Mutations diretas — o form não precisa buscar transações, apenas criar/atualizar
  const createMutation = useMutation({
    mutationFn: async (
      data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    ) => {
      if (schedule === 'single') return TransactionService.create(userId, data)
      if (!seriesRequest.current) seriesRequest.current = crypto.randomUUID()
      const end = endDate ? parsePeriodDate(endDate, true) : undefined
      if (endDate && !end) throw new Error('Informe uma data final válida.')
      await TransactionSeriesService.create(
        userId,
        seriesRequest.current,
        data,
        schedule === 'recurring' ? 'recurring' : 'installment',
        Number(installments),
        end,
      )
      return seriesRequest.current
    },
    onSuccess: async () => {
      await invalidateTransactionData(queryClient, userId)
      toast.success('Lançamento registrado com sucesso!')
    },
    onError: (error: Error) =>
      toast.error(
        schedule === 'single'
          ? error.message || 'Erro ao registrar lançamento.'
          : 'A série pode ter sido salva parcialmente. Repita sem mudar o modo ou abra Séries e use Gerar pendentes. ' +
              error.message,
      ),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      transactionId,
      data,
    }: {
      transactionId: string
      data: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
    }) => TransactionService.update(userId, transactionId, data),
    onSuccess: async () => {
      await invalidateTransactionData(queryClient, userId)
      toast.success('Lançamento atualizado com sucesso!')
    },
    onError: () => toast.error('Erro ao atualizar lançamento.'),
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Prepara as tags (array para string separada por vírgulas)
  const formatTags = React.useCallback((tags: string[] | undefined): string => {
    if (!tags || tags.length === 0) return ''
    return tags.join(', ')
  }, [])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    shouldFocusError: false,
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: editingTransaction?.type ?? defaultType,
      amount: editingTransaction?.amount ?? 0,
      description: editingTransaction?.description ?? '',
      categoryId: editingTransaction?.categoryId ?? '',
      date: parseFirestoreDate(editingTransaction?.date),
      tags: editingTransaction?.tags ?? [],
      notes: editingTransaction?.notes ?? '',
      recurring: editingTransaction?.recurring ?? false,
      creditCardId: editingTransaction?.creditCardId ?? 'none',
    },
  })

  const watchType = useWatch({ control, name: 'type' })

  // Filtra as categorias pelo tipo ativo da transação
  const filteredCategories = categories.filter(
    (c) =>
      (!c.archived || c.id === editingTransaction?.categoryId) &&
      (c.type === watchType || c.type === 'both'),
  )

  // Mapeia categorias filtradas para o formato esperado pelo Select do Base UI
  const categorySelectItems = React.useMemo(() => {
    return filteredCategories.map((c) => ({
      value: c.id,
      label: c.name,
    }))
  }, [filteredCategories])

  const selectableCards = creditCards.filter(
    (card) =>
      (!card.archived && card.isActive) ||
      (editingTransaction?.type === 'expense' &&
        editingTransaction.creditCardId === card.id),
  )
  const cardSelectItems = [
    { value: 'none', label: 'Não usar cartão (Débito)' },
    ...selectableCards.map((card) => ({
      value: card.id,
      label: `${card.name} (${card.bankName})${card.archived ? ' — arquivado' : !card.isActive ? ' — inativo' : ''}`,
    })),
  ]

  const onSubmit = async (data: TransactionInput) => {
    const amountVal =
      typeof data.amount === 'string' ? parseInt(data.amount) : data.amount
    if (amountVal <= 0) return

    try {
      const isExpense = data.type === 'expense'
      const creditCardId =
        isExpense && data.creditCardId !== 'none'
          ? data.creditCardId || null
          : null

      if (isEditMode && editingTransaction) {
        await updateMutation.mutateAsync({
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
            creditCardId,
          },
        })
      } else {
        await createMutation.mutateAsync({
          type: data.type,
          amount: amountVal,
          description: data.description,
          categoryId: data.categoryId,
          date: data.date,
          tags: data.tags,
          notes: data.notes || null,
          recurring: data.recurring,
          creditCardId,
        })
      }
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
    }
  }

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitPending.current) return
    submitPending.current = true
    void handleSubmit(onSubmit, () => {
      // Controllers registram depois dos inputs; o foco segue a ordem visual.
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      })
    })(event).finally(() => {
      submitPending.current = false
    })
  }
  if (categoriesError || cardsError)
    return (
      <LoadError
        error={categoriesError || cardsError}
        retry={() => Promise.all([refetchCategories(), refetchCards()])}
      />
    )

  return (
    <form
      ref={formRef}
      aria-busy={isLoading}
      onSubmit={handleFormSubmit}
      noValidate
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Seletor de Tipo (Receita / Despesa / Investimento) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-foreground text-sm font-semibold">
            Tipo de Lançamento
          </Label>
          <div
            role="group"
            aria-label="Tipo de lançamento"
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            <Button
              type="button"
              aria-pressed={watchType === 'income'}
              variant={watchType === 'income' ? 'default' : 'outline'}
              className={`h-11 w-full cursor-pointer gap-2 rounded-md font-bold transition-all ${
                watchType === 'income'
                  ? 'bg-income text-income-foreground hover:bg-income/90 border-transparent shadow-xs'
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setValue('type', 'income')
                setValue('categoryId', '') // reseta categoria ao mudar tipo
                setValue('creditCardId', 'none')
              }}
              disabled={isLoading}
            >
              <TrendingUp className="size-4" />
              Receita
            </Button>
            <Button
              type="button"
              aria-pressed={watchType === 'expense'}
              variant={watchType === 'expense' ? 'default' : 'outline'}
              className={`h-11 w-full cursor-pointer gap-2 rounded-md font-bold transition-all ${
                watchType === 'expense'
                  ? 'bg-expense text-expense-foreground hover:bg-expense/90 border-transparent shadow-xs'
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
            <Button
              type="button"
              aria-pressed={watchType === 'investment'}
              variant={watchType === 'investment' ? 'default' : 'outline'}
              className={`h-11 w-full cursor-pointer gap-2 rounded-md font-bold transition-all ${
                watchType === 'investment'
                  ? 'bg-investment text-investment-foreground hover:bg-investment/90 border-transparent shadow-xs'
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                setValue('type', 'investment')
                setValue('categoryId', '')
                setValue('creditCardId', 'none')
              }}
              disabled={isLoading}
            >
              <Coins className="size-4" />
              Investir
            </Button>
          </div>
        </div>

        {/* Valor Monetário */}
        <div className="space-y-1.5">
          <Label
            htmlFor="amount"
            className="text-foreground text-sm font-semibold"
          >
            Valor
          </Label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                ref={field.ref}
                onBlur={field.onBlur}
                name={field.name}
                id="amount"
                {...fieldErrorProps('amount', errors.amount)}
                value={
                  typeof field.value === 'string'
                    ? parseInt(field.value)
                    : field.value
                }
                onChange={field.onChange}
                disabled={isLoading}
              />
            )}
          />
          {errors.amount && (
            <p
              id="amount-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.amount.message}
            </p>
          )}
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <Label
            htmlFor="description"
            className="text-foreground text-sm font-semibold"
          >
            Descrição
          </Label>
          <Input
            id="description"
            {...fieldErrorProps('description', errors.description)}
            placeholder="Ex: Aluguel, Supermercado"
            disabled={isLoading}
            {...register('description')}
          />
          {errors.description && (
            <p
              id="description-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <Label
            htmlFor="categoryId"
            className="text-foreground text-sm font-semibold"
          >
            Categoria
          </Label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading || isCategoriesLoading}
                items={categorySelectItems}
              >
                <SelectTrigger
                  id="categoryId"
                  {...fieldErrorProps('categoryId', errors.categoryId)}
                  className="h-11 w-full rounded-md"
                >
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
            <p
              id="categoryId-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.categoryId.message}
            </p>
          )}
        </div>

        {/* Data */}
        <div className="space-y-1.5">
          <Label
            htmlFor="date"
            className="text-foreground text-sm font-semibold"
          >
            Data
          </Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                ref={field.ref}
                onBlur={field.onBlur}
                name={field.name}
                id="date"
                {...fieldErrorProps('date', errors.date)}
                date={field.value}
                setDate={field.onChange}
                disabled={isLoading}
              />
            )}
          />
          {errors.date && (
            <p
              id="date-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.date.message}
            </p>
          )}
        </div>

        {/* Cartão de Crédito (Apenas para Despesa) */}
        {watchType === 'expense' && (
          <div className="space-y-1.5">
            <Label
              htmlFor="creditCardId"
              className="text-foreground text-sm font-semibold"
            >
              Forma de Pagamento (Cartão)
            </Label>
            <Controller
              name="creditCardId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  items={cardSelectItems}
                >
                  <SelectTrigger
                    id="creditCardId"
                    {...fieldErrorProps('creditCardId', errors.creditCardId)}
                    className="h-11 w-full rounded-md"
                  >
                    <SelectValue placeholder="Sem cartão (Débito)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Não usar cartão (Débito)
                    </SelectItem>
                    {selectableCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} ({card.bankName})
                        {card.archived
                          ? ' — arquivado'
                          : !card.isActive
                            ? ' — inativo'
                            : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.creditCardId && (
              <p
                id="creditCardId-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {errors.creditCardId.message}
              </p>
            )}
          </div>
        )}

        <Collapsible
          open={detailsOpen || !!errors.tags || !!errors.notes}
          onOpenChange={setDetailsOpen}
          className="space-y-4 md:col-span-2"
        >
          <CollapsibleTrigger
            render={
              <Button type="button" variant="ghost" className="justify-start" />
            }
          >
            Mais detalhes
          </CollapsibleTrigger>
          <CollapsibleContent
            keepMounted
            className="space-y-4 data-closed:hidden"
          >
            {/* Tags (Opcional) */}
            <div className="space-y-1.5 md:col-span-2">
              <Label
                htmlFor="tags"
                className="text-foreground text-sm font-semibold"
              >
                Tags (separadas por vírgula)
              </Label>
              <Input
                id="tags"
                {...fieldErrorProps('tags', errors.tags)}
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
              {errors.tags && (
                <p
                  id="tags-error"
                  role="alert"
                  className="text-destructive text-sm"
                >
                  {errors.tags.message ??
                    'Use até 20 tags, com no máximo 40 caracteres cada.'}
                </p>
              )}
            </div>

            {/* Notas adicionais */}
            <div className="space-y-1.5 md:col-span-2">
              <Label
                htmlFor="notes"
                className="text-foreground text-sm font-semibold"
              >
                Anotações / Notas
              </Label>
              <Textarea
                id="notes"
                {...fieldErrorProps('notes', errors.notes)}
                rows={3}
                placeholder="Alguma observação importante sobre esta transação..."
                disabled={isLoading}
                {...register('notes')}
              />
              {errors.notes && (
                <p
                  id="notes-error"
                  role="alert"
                  className="text-destructive text-xs font-medium"
                >
                  {errors.notes.message}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {!isEditMode && (
        <fieldset
          className="space-y-3 rounded-md border p-3"
          disabled={isLoading}
        >
          <legend className="px-1 text-sm font-medium">
            Frequência e parcelamento
          </legend>
          <label className="block text-sm">
            Modo do lançamento
            <select
              aria-label="Modo do lançamento"
              className="bg-background block h-11 w-full rounded-md border px-2"
              value={schedule}
              onChange={(e) => {
                setSchedule(e.target.value)
                seriesRequest.current = ''
              }}
            >
              <option value="single">Avulso</option>
              <option value="recurring">Recorrente mensal</option>
              <option value="installment">Compra parcelada no cartão</option>
            </select>
          </label>
          {schedule === 'recurring' && (
            <>
              <label className="block text-sm">
                Repetir até (opcional)
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <p className="text-muted-foreground text-sm">
                Valor por mês. Ocorrências vencidas são geradas ao abrir o app,
                até 120 por execução. Gerencie futuras em Recorrências e
                parcelas.
              </p>
            </>
          )}
          {schedule === 'installment' && (
            <>
              <label className="block text-sm">
                Quantidade de parcelas
                <Input
                  type="number"
                  min={2}
                  max={120}
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </label>
              <p className="text-muted-foreground text-sm">
                Informe o valor total da compra acima e selecione um cartão
                ativo. O total será distribuído sem perda de centavos nas
                próximas faturas. Parcelas podem ser editadas individualmente.
              </p>
            </>
          )}
        </fieldset>
      )}
      {editingTransaction?.seriesId && (
        <p className="text-muted-foreground text-sm">
          Esta edição altera apenas esta ocorrência. Edite ou cancele futuras em
          Recorrências e parcelas.
        </p>
      )}
      {/* Botões de Ação */}
      <Button
        type="submit"
        className="mt-2 h-11 w-full cursor-pointer rounded-md text-sm font-bold"
        disabled={isLoading}
      >
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
      <p role="status" className="sr-only">
        {isLoading ? 'Salvando lançamento…' : ''}
      </p>
    </form>
  )
}
