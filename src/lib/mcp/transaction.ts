import { z } from 'zod'
import { transactionSchema } from '@/lib/validations/transaction.schema'

export const MCP_TIME_ZONE = 'America/Sao_Paulo'
export const civilDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MCP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

// Meio-dia civil evita mudança de dia ao exibir no Brasil e transições à meia-noite.
export function civilTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data inválida.')
  const target = new Date(`${value}T12:00:00Z`)
  if (
    !Number.isFinite(target.getTime()) ||
    target.toISOString().slice(0, 10) !== value
  )
    throw new Error('Data inválida.')
  let date = target
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: MCP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date)
    const part = (name: string) =>
      parts.find((item) => item.type === name)?.value
    const wallTime = Date.parse(
      `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`,
    )
    date = new Date(date.getTime() + target.getTime() - wallTime)
  }
  return date
}

export const mcpTransactionSchema = transactionSchema
  .omit({ date: true, recurring: true })
  .extend({
    amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    categoryId: z.string().regex(/^[^/]{1,128}$/),
    creditCardId: z
      .string()
      .regex(/^[^/]{1,128}$/)
      .nullable()
      .optional()
      .default(null),
    date: z
      .string()
      .refine((value) => {
        try {
          civilTimestamp(value)
          return true
        } catch {
          return false
        }
      }, 'Data inválida.')
      .optional(),
  })
  .strict()

export const createMcpTransactionSchema = z
  .object({
    idempotencyKey: z.string().min(16).max(128),
    transaction: mcpTransactionSchema,
  })
  .strict()

export function normalizeMcpTransaction(
  input: z.infer<typeof mcpTransactionSchema>,
) {
  return {
    ...input,
    date: input.date ?? civilDate(),
    notes: input.notes ?? null,
    recurring: false,
  }
}
