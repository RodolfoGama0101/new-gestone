import { z } from 'zod'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'
import { getTransactionDate } from '@/lib/utils/transaction-date'
import { AnalyticsService } from '@/services/analytics.service'
import { budgetProgress } from '@/lib/utils/budget'
import { invoiceCycle } from '@/lib/utils/invoice-cycle'
import { civilDate, civilTimestamp, mcpTransactionSchema } from './transaction'
import { McpError } from './config'

export const mcpId = z.string().regex(/^[^/]{1,128}$/)
export const mcpMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((v) => {
    try {
      civilTimestamp(`${v}-01`)
      return true
    } catch {
      return false
    }
  }, 'Mês inválido.')
export const summarySchema = z
  .object({ month: mcpMonth, referenceDate: mcpTransactionSchema.shape.date })
  .strict()
export const getTransactionSchema = z.object({ id: mcpId }).strict()
export const catalogSchema = z
  .object({
    includeArchived: z.boolean().default(false),
    includeInactive: z.boolean().default(false),
  })
  .strict()
export const seriesListSchema = z
  .object({
    cursor: mcpId.optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict()
export const invoiceSchema = z
  .object({
    cardId: mcpId,
    month: mcpMonth,
    cursor: mcpId.optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict()
export const budgetSchema = z.object({ month: mcpMonth }).strict()

// Converte o dia de São Paulo em calendário local para os cálculos puros do app.
// Nenhum instante real é reinterpretado usando o fuso do runtime.
export function calendarDate(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  const result = new Date(0)
  result.setFullYear(year, month - 1, date)
  result.setHours(12, 0, 0, 0)
  return result
}
export function calendarDay(date: Date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function calendarTransactions(items: Transaction[]) {
  return items.map((item) => ({
    ...item,
    date: calendarDate(civilDate((item.date as { toDate(): Date }).toDate())),
  }))
}
export function safeMoney(value: number) {
  if (!Number.isSafeInteger(value))
    throw new McpError(
      'amount_overflow',
      'O total excede o limite seguro de cálculo.',
    )
  return value
}
export function sumMoney(items: { amount: number }[]) {
  const sum = items.reduce(
    (total, item) => total + BigInt(safeMoney(item.amount)),
    BigInt(0),
  )
  return safeMoney(Number(sum))
}
export function competence(item: Transaction, cards: CreditCard[]) {
  return calendarDay(getTransactionDate(item, cards)).slice(0, 7)
}
export function financialSummary(
  items: Transaction[],
  cards: CreditCard[],
  month: string,
  referenceDate = civilDate(),
) {
  const rows = calendarTransactions(items)
  // Impede arredondamento durante qualquer soma intermediária do cálculo compartilhado.
  sumMoney(rows)
  const reservations = rows.filter(
    (row) =>
      calendarDay(row.date as Date).slice(0, 7) === month &&
      calendarDay(row.date as Date) <= referenceDate,
  )
  const result = AnalyticsService.calculateSummary(
    rows,
    calendarDate(`${month}-01`),
    cards,
    calendarDate(referenceDate),
    reservations,
  )
  const categories: Record<
    string,
    { income: number; expense: number; investment: number }
  > = Object.create(null)
  for (const item of rows.filter((item) => competence(item, cards) === month)) {
    categories[item.categoryId] ??= { income: 0, expense: 0, investment: 0 }
    categories[item.categoryId][item.type] = safeMoney(
      categories[item.categoryId][item.type] + item.amount,
    )
  }
  return {
    ...result,
    balance: safeMoney(result.balance),
    availableBalance: safeMoney(result.availableBalance),
    reservationReferenceDate: calendarDay(result.reservationReferenceDate),
    categories,
  }
}
export function financialBudget(
  items: Transaction[],
  cards: CreditCard[],
  month: string,
) {
  const rows = calendarTransactions(items)
  sumMoney(rows)
  return budgetProgress(rows, calendarDate(`${month}-01`), cards)
}
export function financialInvoice(
  items: Transaction[],
  card: CreditCard,
  month: string,
  payment: { amount: number; paidAt: unknown } | null,
  today = civilDate(),
) {
  const rows = calendarTransactions(items).filter(
    (item) =>
      item.type === 'expense' &&
      item.creditCardId === card.id &&
      competence(item, [card]) === month,
  )
  const total = sumMoney(rows)
  const cycle = invoiceCycle(card, calendarDate(`${month}-01`))
  const closing = calendarDay(cycle.closing)
  const status = payment
    ? payment.amount === total
      ? 'paid'
      : 'changed_after_payment'
    : today <= closing
      ? 'open'
      : 'closed'
  return {
    cardId: card.id,
    month,
    total,
    payment,
    status,
    start: calendarDay(cycle.start),
    closing,
    due: cycle.due ? calendarDay(cycle.due) : null,
    transactions: rows.map((row) => ({
      ...row,
      date: calendarDay(row.date as Date),
    })),
  }
}
