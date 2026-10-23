'use client'

import { fieldErrorProps } from '@/lib/utils/form-accessibility'

import * as React from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCardService } from '@/services/credit-card.service'
import { useAuth } from '@/contexts/auth-context'
import {
  creditCardSchema,
  type CreditCardInput,
} from '@/lib/validations/credit-card.schema'
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
import { CreditCardVisual } from '@/components/credit-cards/credit-card-visual'
import { CreditCard } from '@/types/credit-card'
import { cardAppearance } from '@/lib/utils/card-appearance'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  { value: '#18181b', label: 'Grafite' },
  { value: '#820ad1', label: 'Roxo' },
  { value: '#004b87', label: 'Azul profundo' },
  { value: '#4f46e5', label: 'Índigo' },
  { value: '#0284c7', label: 'Azul céu' },
  { value: '#0d9488', label: 'Verde petróleo' },
  { value: '#166534', label: 'Verde floresta' },
  { value: '#dc2626', label: 'Vermelho' },
  { value: '#be185d', label: 'Rosa' },
  { value: '#ff7a00', label: 'Laranja' },
  { value: '#d4b877', label: 'Champanhe' },
  { value: '#e2e8f0', label: 'Platina' },
]

interface CreditCardFormProps {
  onSuccess?: () => void
  editingCard?: CreditCard
}

export function CreditCardForm({
  onSuccess,
  editingCard,
}: CreditCardFormProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.uid ?? ''

  const isEditMode = !!editingCard

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) =>
      CreditCardService.create(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      toast.success('Cartão de crédito cadastrado com sucesso!')
    },
    onError: () => toast.error('Erro ao cadastrar cartão de crédito.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      cardId,
      data,
    }: {
      cardId: string
      data: Partial<Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>>
    }) => CreditCardService.update(userId, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditCards', userId] })
      queryClient.invalidateQueries({ queryKey: ['analytics', userId] })
      toast.success('Cartão de crédito atualizado com sucesso!')
    },
    onError: () => toast.error('Erro ao atualizar cartão de crédito.'),
  })

  const isLoading = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      name: editingCard?.name ?? '',
      bankName: editingCard?.bankName ?? '',
      brand: editingCard?.brand ?? 'visa',
      holderName: editingCard?.holderName ?? '',
      closingDay: editingCard?.closingDay ?? 10,
      dueDay: editingCard?.dueDay ?? null,
      color: editingCard?.color ?? '#820ad1',
      isActive: editingCard?.isActive ?? true,
    },
  })

  // Assistir os campos para o live preview
  const [
    watchName,
    watchBankName,
    watchBrand,
    watchHolderName,
    watchClosingDay,
    watchColor,
  ] = useWatch({
    control,
    name: ['name', 'bankName', 'brand', 'holderName', 'closingDay', 'color'],
  })

  const onSubmit = async (data: CreditCardInput) => {
    try {
      if (isEditMode && editingCard) {
        await updateMutation.mutateAsync({
          cardId: editingCard.id,
          data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <form
      aria-busy={isLoading}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid min-w-0 gap-6 pt-2 lg:grid-cols-[0.95fr_1.05fr]"
    >
      {/* Live Preview */}
      <div className="bg-muted/30 min-w-0 space-y-6 rounded-xl border p-4 sm:p-5 lg:self-start">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Seu cartão, do seu jeito</h3>
          <p className="text-muted-foreground text-xs">
            Veja as alterações enquanto personaliza.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[400px]">
          <CreditCardVisual
            name={watchName || 'Nome do Cartão'}
            bankName={watchBankName || 'Banco'}
            brand={watchBrand as 'visa' | 'mastercard' | 'elo' | 'other'}
            holderName={watchHolderName || 'NOME DO TITULAR'}
            closingDay={watchClosingDay || 10}
            color={watchColor}
          />
        </div>
        <fieldset disabled={isLoading} className="min-w-0 space-y-3">
          <legend className="mb-3 text-sm font-medium">Cor do cartão</legend>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() =>
                  setValue('color', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                aria-label={`Cor ${label}`}
                aria-pressed={watchColor?.toLowerCase() === value}
                className="focus-visible:ring-ring flex aspect-square min-h-9 w-full cursor-pointer items-center justify-center rounded-lg border border-black/10 transition-transform outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed motion-reduce:transition-none"
                style={{
                  backgroundColor: value,
                  color: cardAppearance(value).foreground,
                }}
              >
                {watchColor?.toLowerCase() === value && (
                  <Check className="size-4" />
                )}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customCardColor">Cor personalizada</Label>
            <div className="flex min-w-0 items-center gap-2">
              <input
                id="customCardColor"
                type="color"
                value={cardAppearance(watchColor).color}
                onChange={(event) =>
                  setValue('color', event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                className="bg-background focus-visible:outline-ring h-10 w-12 shrink-0 cursor-pointer rounded-md border p-1 focus-visible:outline-2"
              />
              <div className="min-w-0 flex-1">
                <Label htmlFor="cardColorHex" className="sr-only">
                  Código hexadecimal da cor
                </Label>
                <Input
                  id="cardColorHex"
                  placeholder="#820ad1"
                  maxLength={7}
                  {...fieldErrorProps('color', errors.color)}
                  {...register('color')}
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Escolha uma cor ou informe seu código hexadecimal. O texto se
              adapta para manter a leitura.
            </p>
            {errors.color && (
              <p
                id="color-error"
                role="alert"
                className="text-destructive text-xs"
              >
                {errors.color.message}
              </p>
            )}
          </div>
        </fieldset>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:content-start">
        <div className="space-y-1 sm:col-span-2">
          <h3 className="text-sm font-medium">Dados do cartão</h3>
          <p className="text-muted-foreground text-xs">
            Identifique o cartão e organize o ciclo da fatura.
          </p>
        </div>
        {/* Nome do Cartão */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Apelido do Cartão</Label>
          <Input
            id="name"
            {...fieldErrorProps('name', errors.name)}
            placeholder="Ex: Nubank, Azul Platinum"
            disabled={isLoading}
            {...register('name')}
          />
          {errors.name && (
            <p
              id="name-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Nome do Banco */}
        <div className="space-y-1.5">
          <Label htmlFor="bankName">Nome do Banco</Label>
          <Input
            id="bankName"
            {...fieldErrorProps('bankName', errors.bankName)}
            placeholder="Ex: Itaú, Nubank, Bradesco"
            disabled={isLoading}
            {...register('bankName')}
          />
          {errors.bankName && (
            <p
              id="bankName-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.bankName.message}
            </p>
          )}
        </div>

        {/* Nome do Titular */}
        <div className="space-y-1.5">
          <Label htmlFor="holderName">Nome do Titular</Label>
          <Input
            id="holderName"
            {...fieldErrorProps('holderName', errors.holderName)}
            placeholder="Ex: RODOLFO GAMA"
            disabled={isLoading}
            {...register('holderName')}
          />
          {errors.holderName && (
            <p
              id="holderName-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.holderName.message}
            </p>
          )}
        </div>

        {/* Bandeira */}
        <div className="space-y-1.5">
          <Label htmlFor="brand">Bandeira</Label>
          <Controller
            name="brand"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
                items={[
                  { value: 'visa', label: 'Visa' },
                  { value: 'mastercard', label: 'Mastercard' },
                  { value: 'elo', label: 'Elo' },
                  { value: 'other', label: 'Outro' },
                ]}
              >
                <SelectTrigger
                  id="brand"
                  {...fieldErrorProps('brand', errors.brand)}
                  className="h-10 w-full rounded-lg"
                >
                  <SelectValue placeholder="Selecione a bandeira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="elo">Elo</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.brand && (
            <p
              id="brand-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.brand.message}
            </p>
          )}
        </div>

        {/* Dia de Fechamento */}
        <div className="space-y-1.5">
          <Label htmlFor="closingDay">Dia de Fechamento (1-31)</Label>
          {editingCard && (
            <p className="text-muted-foreground text-xs">
              Novas compras registram este fechamento. Compras antigas sem
              fechamento registrado usam a configuração atual e podem mudar de
              fatura ao alterá-la.
            </p>
          )}
          <Input
            id="closingDay"
            {...fieldErrorProps('closingDay', errors.closingDay)}
            type="number"
            min={1}
            max={31}
            disabled={isLoading}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1
              setValue('closingDay', Math.max(1, Math.min(31, val)))
            }}
            value={watchClosingDay}
          />
          {errors.closingDay && (
            <p
              id="closingDay-error"
              role="alert"
              className="text-destructive text-xs font-medium"
            >
              {errors.closingDay.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dueDay">Dia de vencimento (opcional)</Label>
          <Controller
            name="dueDay"
            control={control}
            render={({ field }) => (
              <Input
                id="dueDay"
                type="number"
                min={1}
                max={31}
                value={field.value ?? ''}
                onChange={(e) =>
                  field.onChange(e.target.value ? Number(e.target.value) : null)
                }
                disabled={isLoading}
                {...fieldErrorProps('dueDay', errors.dueDay)}
              />
            )}
          />
          {errors.dueDay && (
            <p
              id="dueDay-error"
              role="alert"
              className="text-destructive text-sm"
            >
              Informe um dia de 1 a 31.
            </p>
          )}
          <p className="text-muted-foreground text-sm">
            Se o vencimento for igual ou anterior ao fechamento, vence no mês
            seguinte. Meses curtos usam o último dia.
          </p>
        </div>
        {/* Status (Ativo/Inativo) - apenas no edit */}
        {isEditMode && (
          <div className="space-y-1.5">
            <Label htmlFor="isActive">Status do Cartão</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? 'true' : 'false'}
                  onValueChange={(val) => field.onChange(val === 'true')}
                  disabled={isLoading}
                  items={[
                    { value: 'true', label: 'Ativo' },
                    { value: 'false', label: 'Inativo' },
                  ]}
                >
                  <SelectTrigger
                    id="isActive"
                    {...fieldErrorProps('isActive', errors.isActive)}
                    className="h-10 w-full rounded-lg"
                  >
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      <div className="border-border flex flex-wrap justify-end gap-2 border-t pt-4 lg:col-span-2">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => {
            if (onSuccess) onSuccess()
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="font-semibold">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Salvando...
            </>
          ) : isEditMode ? (
            'Salvar Alterações'
          ) : (
            'Cadastrar Cartão'
          )}
        </Button>
      </div>
      <p role="status" className="sr-only">
        {isLoading ? 'Salvando cartão…' : ''}
      </p>
    </form>
  )
}
