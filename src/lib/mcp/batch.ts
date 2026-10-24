import { z } from 'zod'
import { civilDate, civilTimestamp, mcpTransactionSchema } from './transaction'

export const MAX_MCP_BATCH = 20
export const MCP_PREVIEW_TTL = 30 * 60 * 1000
const date = mcpTransactionSchema.shape.date.unwrap()
export const listMcpTransactionsSchema = z
  .object({
    startDate: date.optional(),
    endDate: date.optional(),
    limit: z.number().int().min(1).max(50).default(20),
    cursor: z.string().min(1).max(2048).optional(),
  })
  .strict()
  .refine(
    (v) => !v.startDate || !v.endDate || v.startDate <= v.endDate,
    'O início deve ser anterior ao fim.',
  )
export const prepareMcpTransactionsSchema = z
  .object({
    idempotencyKey: z.string().min(16).max(128),
    source: z.enum(['text', 'receipts']).default('text'),
    transactions: z.array(mcpTransactionSchema).min(1).max(MAX_MCP_BATCH),
  })
  .strict()
export const commitMcpTransactionsSchema = z
  .object({
    previewId: z.string().regex(/^preview-[a-f0-9]{64}$/),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/),
    confirmed: z.literal(true),
    allowDuplicates: z.boolean().default(false),
  })
  .strict()

// Encontra a fronteira civil, inclusive em dias históricos de mudança de fuso.
export function civilDayBounds(day: string) {
  const noon = civilTimestamp(day).getTime()
  const boundary = (after: boolean) => {
    let low = noon - 36 * 3_600_000,
      high = noon + 36 * 3_600_000
    while (low < high) {
      const mid = Math.floor((low + high) / 2)
      const civil = civilDate(new Date(mid))
      if (after ? civil > day : civil >= day) high = mid
      else low = mid + 1
    }
    return new Date(low)
  }
  return { start: boundary(false), end: boundary(true) }
}

export function duplicateSignature(value: {
  date: string
  type: string
  amount: number
  description: string
}) {
  return JSON.stringify([
    value.date,
    value.type,
    value.amount,
    value.description
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLocaleLowerCase('pt-BR')
      .trim()
      .replace(/\s+/g, ' '),
  ])
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}
