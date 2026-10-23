import { z } from 'zod'

export const creditCardSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').max(50),
  bankName: z
    .string()
    .min(2, 'O nome do banco deve ter pelo menos 2 caracteres')
    .max(50),
  brand: z.enum(['visa', 'mastercard', 'elo', 'other']),
  holderName: z
    .string()
    .min(2, 'O nome do titular deve ter pelo menos 2 caracteres')
    .max(100),
  closingDay: z.number().int().min(1, 'Dia inválido').max(31, 'Dia inválido'),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  color: z
    .string()
    .max(32)
    .regex(
      /^(?:#[\da-fA-F]{3}(?:[\da-fA-F]{3})?|hsl\(\s*\d{1,3}(?:\.\d+)?[,\s]+(?:100|\d{1,2})(?:\.\d+)?%[,\s]+(?:100|\d{1,2})(?:\.\d+)?%\s*\))$/,
      'Informe uma cor hexadecimal válida, como #820ad1',
    ),
  isActive: z.boolean().default(true),
})

export type CreditCardInput = z.infer<typeof creditCardSchema>
