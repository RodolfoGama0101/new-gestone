import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.union([
    z.number().positive('O valor deve ser maior que zero'),
    z.string().min(1, 'O valor é obrigatório')
  ]),
  description: z
    .string()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres')
    .max(200, 'A descrição não pode exceder 200 caracteres'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  date: z.date({
    message: 'A data é obrigatória',
  }),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(500, 'A nota não pode exceder 500 caracteres').nullable().optional(),
  recurring: z.boolean().default(false),
})

export type TransactionInput = z.infer<typeof transactionSchema>
