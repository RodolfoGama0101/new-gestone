'use client'

import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCardService } from '@/services/credit-card.service'
import { useAuth } from '@/contexts/auth-context'
import { creditCardSchema, type CreditCardInput } from '@/lib/validations/credit-card.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCardVisual } from '@/components/credit-cards/credit-card-visual'
import { CreditCard } from '@/types/credit-card'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  '#820ad1', // Nubank Roxo
  '#004b87', // Itaú Azul
  '#ff7a00', // Inter Laranja
  '#dc2626', // Bradesco Vermelho
  '#18181b', // Grafite Escuro
  '#d97706', // Ouro / Gold
  '#0d9488', // Verde Menta / Teal
  '#4f46e5', // Azul Royal / Indigo
  '#0284c7', // Sky Blue
  '#7c7c82', // Platina / Cinza
]

interface CreditCardFormProps {
  onSuccess?: () => void
  editingCard?: CreditCard
}

export function CreditCardForm({ onSuccess, editingCard }: CreditCardFormProps) {
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
    mutationFn: ({ cardId, data }: {
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
    watch,
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
      color: editingCard?.color ?? '#820ad1',
      isActive: editingCard?.isActive ?? true,
    },
  })

  // Assistir os campos para o live preview
  const watchName = watch('name')
  const watchBankName = watch('bankName')
  const watchBrand = watch('brand')
  const watchHolderName = watch('holderName')
  const watchClosingDay = watch('closingDay')
  const watchColor = watch('color')

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
      {/* Live Preview */}
      <div className="flex justify-center bg-muted/20 p-4 rounded-xl border border-border/40">
        <div className="w-full max-w-[280px]">
          <CreditCardVisual
            name={watchName || 'Nome do Cartão'}
            bankName={watchBankName || 'Banco'}
            brand={watchBrand as 'visa' | 'mastercard' | 'elo' | 'other'}
            holderName={watchHolderName || 'NOME DO TITULAR'}
            closingDay={watchClosingDay || 10}
            color={watchColor}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome do Cartão */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Apelido do Cartão</Label>
          <Input
            id="name"
            placeholder="Ex: Nubank, Azul Platinum"
            disabled={isLoading}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs font-medium text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Nome do Banco */}
        <div className="space-y-1.5">
          <Label htmlFor="bankName">Nome do Banco</Label>
          <Input
            id="bankName"
            placeholder="Ex: Itaú, Nubank, Bradesco"
            disabled={isLoading}
            {...register('bankName')}
          />
          {errors.bankName && (
            <p className="text-xs font-medium text-destructive">{errors.bankName.message}</p>
          )}
        </div>

        {/* Nome do Titular */}
        <div className="space-y-1.5">
          <Label htmlFor="holderName">Nome do Titular</Label>
          <Input
            id="holderName"
            placeholder="Ex: RODOLFO GAMA"
            disabled={isLoading}
            {...register('holderName')}
          />
          {errors.holderName && (
            <p className="text-xs font-medium text-destructive">{errors.holderName.message}</p>
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
                <SelectTrigger id="brand" className="w-full h-10 rounded-lg">
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
            <p className="text-xs font-medium text-destructive">{errors.brand.message}</p>
          )}
        </div>

        {/* Dia de Fechamento */}
        <div className="space-y-1.5">
          <Label htmlFor="closingDay">Dia de Fechamento (1-31)</Label>
          <Input
            id="closingDay"
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
            <p className="text-xs font-medium text-destructive">{errors.closingDay.message}</p>
          )}
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
                  <SelectTrigger id="isActive" className="w-full h-10 rounded-lg">
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

        {/* Seletor de Cores */}
        <div className="space-y-2 md:col-span-2">
          <Label>Cor do Cartão</Label>
          <div className="grid grid-cols-5 gap-y-3 justify-items-center">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue('color', color)}
                className="size-9 rounded-full border border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 animate-transition"
                style={{ backgroundColor: color }}
              >
                {watchColor === color && (
                  <Check className="size-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
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
    </form>
  )
}
