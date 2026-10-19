import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'investment']),
  amount: z.union([
    z
      .number()
      .int('Informe o valor em centavos inteiros')
      .positive('O valor deve ser maior que zero')
      .max(Number.MAX_SAFE_INTEGER, 'O valor excede o limite permitido'),
    z
      .string()
      .regex(/^[1-9]\d*$/, 'Informe um valor positivo em centavos inteiros')
      .refine(
        (value) => Number.isSafeInteger(Number(value)),
        'O valor excede o limite permitido',
      ),
  ]),
  description: z
    .string()
    .min(3, 'A descrição deve ter pelo menos 3 caracteres')
    .max(200, 'A descrição não pode exceder 200 caracteres'),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  date: z.date({
    message: 'A data é obrigatória',
  }),
  tags: z
    .array(
      z
        .string()
        .min(1, 'A tag não pode ser vazia')
        .max(40, 'Cada tag pode ter até 40 caracteres'),
    )
    .max(20, 'Use no máximo 20 tags')
    .default([]),
  notes: z
    .string()
    .max(500, 'A nota não pode exceder 500 caracteres')
    .nullable()
    .optional(),
  recurring: z.boolean().default(false),
  creditCardId: z.string().nullable().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
