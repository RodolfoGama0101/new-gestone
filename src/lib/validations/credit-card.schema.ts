import { z } from 'zod'

export const creditCardSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(50),
  bankName: z.string().min(2, 'O nome do banco deve ter pelo menos 2 caracteres').max(50),
  brand: z.enum(['visa', 'mastercard', 'elo', 'other']),
  holderName: z.string().min(2, 'O nome do titular deve ter pelo menos 2 caracteres').max(100),
  closingDay: z.number().int().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  color: z.string().min(1, 'Selecione uma cor'),
  isActive: z.boolean().default(true),
})

export type CreditCardInput = z.infer<typeof creditCardSchema>
