import { z } from 'zod'
import { creditCardSchema } from '@/lib/validations/credit-card.schema'
import { mcpTransactionSchema } from './transaction'
import { mcpId, mcpMonth } from './finance'

const amount = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const date = mcpTransactionSchema.shape.date.unwrap()
const category = z
  .object({
    name: z.string().min(2).max(60),
    type: z.enum(['income', 'expense', 'investment', 'both']),
    icon: z.string().min(1).max(80),
    color: z.string().min(1).max(32),
  })
  .strict()
const patch = mcpTransactionSchema
  .extend({
    tags: mcpTransactionSchema.shape.tags.removeDefault(),
    creditCardId: mcpTransactionSchema.shape.creditCardId.removeDefault(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Informe uma alteração.')
const cardPatch = creditCardSchema
  .extend({ isActive: creditCardSchema.shape.isActive.removeDefault() })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Informe uma alteração.')
export const mcpOperationSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('update_transaction'),
      id: mcpId,
      changes: patch,
    })
    .strict(),
  z.object({ action: z.literal('delete_transaction'), id: mcpId }).strict(),
  z.object({ action: z.literal('create_category'), data: category }).strict(),
  z
    .object({
      action: z.literal('update_category'),
      id: mcpId,
      changes: category.partial().refine((v) => Object.keys(v).length > 0),
    })
    .strict(),
  z.object({ action: z.literal('remove_category'), id: mcpId }).strict(),
  z
    .object({
      action: z.literal('create_card'),
      data: creditCardSchema.strict(),
    })
    .strict(),
  z
    .object({ action: z.literal('update_card'), id: mcpId, changes: cardPatch })
    .strict(),
  z.object({ action: z.literal('archive_card'), id: mcpId }).strict(),
  z.object({ action: z.literal('delete_card'), id: mcpId }).strict(),
  z
    .object({
      action: z.literal('pay_invoice'),
      cardId: mcpId,
      month: mcpMonth,
    })
    .strict(),
  z
    .object({
      action: z.literal('reverse_invoice_payment'),
      cardId: mcpId,
      month: mcpMonth,
    })
    .strict(),
  z
    .object({
      action: z.literal('create_series'),
      transaction: mcpTransactionSchema,
      kind: z.enum(['recurring', 'installment']),
      count: z.number().int().min(2).max(120).optional(),
      endDate: date.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('edit_series_future'),
      id: mcpId,
      amount,
      description: z.string().min(3).max(200),
    })
    .strict(),
  z
    .object({ action: z.literal('cancel_series'), id: mcpId, from: date })
    .strict(),
  z.object({ action: z.literal('generate_series'), id: mcpId }).strict(),
  z
    .object({ action: z.literal('set_budget_goal'), month: mcpMonth, amount })
    .strict(),
  z
    .object({ action: z.literal('remove_budget_goal'), month: mcpMonth })
    .strict(),
  z
    .object({
      action: z.literal('set_budget_limit'),
      month: mcpMonth,
      categoryId: mcpId,
      amount,
    })
    .strict(),
  z
    .object({
      action: z.literal('remove_budget_limit'),
      month: mcpMonth,
      categoryId: mcpId,
    })
    .strict(),
])
export type McpOperation = z.infer<typeof mcpOperationSchema>
export function operationScope(operation: McpOperation) {
  const action = operation.action
  const domain = action.endsWith('_transaction')
    ? 'transactions'
    : action.endsWith('_category')
      ? 'categories'
      : action.endsWith('_card')
        ? 'cards'
        : action.includes('invoice')
          ? 'invoices'
          : action.includes('series')
            ? 'series'
            : 'budgets'
  return `${domain}:write`
}
export const prepareOperationsSchema = z
  .object({
    idempotencyKey: z.string().min(16).max(128),
    operations: z.array(mcpOperationSchema).min(1).max(20),
  })
  .strict()
  .superRefine((value, context) => {
    for (const operation of value.operations) {
      if (operation.action !== 'create_series') continue
      if (
        operation.kind === 'installment' &&
        (operation.count === undefined || operation.endDate !== undefined)
      )
        context.addIssue({
          code: 'custom',
          message:
            'Parcelamento exige count e não aceita endDate; todas as parcelas compõem o total.',
        })
      if (operation.kind === 'recurring' && operation.count !== undefined)
        context.addIssue({
          code: 'custom',
          message: 'Recorrência usa endDate opcional, sem count.',
        })
    }
    if (
      value.operations.length > 1 &&
      value.operations.some(
        (op) =>
          !['update_transaction', 'delete_transaction'].includes(op.action),
      )
    )
      context.addIssue({
        code: 'custom',
        message: 'Somente alterações/exclusões de lançamentos aceitam lote.',
      })
    const ids = value.operations
      .filter((op) => 'id' in op)
      .map((op) => ('id' in op ? op.id : ''))
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: 'custom',
        message: 'Um alvo não pode aparecer duas vezes na mesma prévia.',
      })
  })
export const commitOperationsSchema = z
  .object({
    previewId: z.string().regex(/^operation-[a-f0-9]{64}$/),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/),
    confirmed: z.literal(true),
  })
  .strict()
