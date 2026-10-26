import {
  FieldPath,
  Timestamp,
  type DocumentData,
  type Query,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type Transaction as AdminTransaction,
} from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { assertAllowedUid, hashSecret, McpError } from '@/lib/mcp/config'
import { canonicalJson, civilDayBounds } from '@/lib/mcp/batch'
import { civilDate } from '@/lib/mcp/transaction'
import {
  budgetSchema,
  catalogSchema,
  competence,
  calendarTransactions,
  financialBudget,
  financialInvoice,
  financialSummary,
  getTransactionSchema,
  invoiceSchema,
  seriesListSchema,
  summarySchema,
  safeMoney,
} from '@/lib/mcp/finance'
import type { Transaction } from '@/types/transaction'
import type { CreditCard } from '@/types/credit-card'

export const financeMetadata = {
  currency: 'BRL',
  amountUnit: 'centavos',
  timeZone: 'America/Sao_Paulo',
}
export function mcpParse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    throw new McpError(
      'invalid_request',
      parsed.error.issues.map((i) => i.message).join(' '),
    )
  return parsed.data
}
export function serializeMcp(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  )
    return value.toDate().toISOString()
  if (Array.isArray(value)) return value.map(serializeMcp)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeMcp(item)]),
    )
  return value
}
export function recordVersion(value: unknown) {
  const versionData = (item: unknown): unknown => {
    if (
      item &&
      typeof item === 'object' &&
      'seconds' in item &&
      'nanoseconds' in item
    )
      return { seconds: item.seconds, nanoseconds: item.nanoseconds }
    if (Array.isArray(item)) return item.map(versionData)
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [key, versionData(child)]),
      )
    return item
  }
  return hashSecret(canonicalJson(versionData(value)))
}

// O limite é global à operação; nunca retornar uma agregação truncada.
export async function boundedMcpRead(
  query: Query,
  tx?: AdminTransaction,
  maximum = 5000,
) {
  const docs: QueryDocumentSnapshot[] = []
  let next = query.orderBy(FieldPath.documentId())
  for (;;) {
    const page: QuerySnapshot = tx
      ? await tx.get(next.limit(Math.min(250, maximum + 1 - docs.length)))
      : await next.limit(Math.min(250, maximum + 1 - docs.length)).get()
    docs.push(...page.docs)
    if (docs.length > maximum)
      throw new McpError(
        'query_limit',
        `A consulta excede ${maximum} registros. Reduza o período ou revise no aplicativo.`,
      )
    if (
      page.empty ||
      page.size < Math.min(250, maximum + 1 - (docs.length - page.size))
    )
      return docs
    next = query.orderBy(FieldPath.documentId()).startAfter(page.docs.at(-1)!)
  }
}
export async function mcpFinancialData(
  uid: string,
  tx?: AdminTransaction,
  month?: string,
) {
  let query: Query = adminDb.collection(`users/${uid}/transactions`)
  if (month) {
    const anchor = new Date(`${month}-01T12:00:00Z`)
    const first = new Date(anchor)
    first.setUTCMonth(first.getUTCMonth() - 2)
    const end = new Date(anchor)
    end.setUTCMonth(end.getUTCMonth() + 1)
    query = query
      .where(
        'date',
        '>=',
        Timestamp.fromDate(
          civilDayBounds(first.toISOString().slice(0, 10)).start,
        ),
      )
      .where(
        'date',
        '<',
        Timestamp.fromDate(
          civilDayBounds(end.toISOString().slice(0, 10)).start,
        ),
      )
      .orderBy('date')
  }
  const [records, cards] = await Promise.all([
    boundedMcpRead(query, tx),
    boundedMcpRead(adminDb.collection(`users/${uid}/creditCards`), tx),
  ])
  return {
    transactions: records.map(
      (d) => ({ ...d.data(), id: d.id }) as Transaction,
    ),
    cards: cards.map((d) => ({ ...d.data(), id: d.id }) as CreditCard),
  }
}
export async function getMcpTransaction(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const { id } = mcpParse(getTransactionSchema, input)
  const doc = await adminDb.doc(`users/${uid}/transactions/${id}`).get()
  if (!doc.exists)
    throw new McpError('not_found', 'Lançamento não encontrado.', 404)
  const data = doc.data()!
  const card = data.creditCardId
    ? await adminDb.doc(`users/${uid}/creditCards/${data.creditCardId}`).get()
    : null
  return {
    ...financeMetadata,
    transaction: {
      ...(serializeMcp(data) as DocumentData),
      id,
      date: civilDate(data.date.toDate()),
      competence: competence(
        calendarTransactions([{ ...data, id } as Transaction])[0],
        card?.exists ? [{ ...card.data(), id: card.id } as CreditCard] : [],
      ),
      version: recordVersion(data),
    },
  }
}
export async function getMcpSummary(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const args = mcpParse(summarySchema, input)
  const data = await mcpFinancialData(uid, undefined, args.month)
  return {
    ...financeMetadata,
    month: args.month,
    ...financialSummary(
      data.transactions,
      data.cards,
      args.month,
      args.referenceDate,
    ),
  }
}
export async function listMcpCatalog(
  uid: string,
  kind: 'categories' | 'creditCards',
  input: unknown,
) {
  assertAllowedUid(uid)
  const args = mcpParse(catalogSchema, input)
  const records = await boundedMcpRead(
    adminDb.collection(`users/${uid}/${kind}`),
  )
  return {
    items: records
      .filter(
        (doc) =>
          (args.includeArchived || !doc.data().archived) &&
          (kind === 'categories' ||
            args.includeInactive ||
            doc.data().isActive === true),
      )
      .map((doc) => ({
        id: doc.id,
        ...(serializeMcp(doc.data()) as DocumentData),
        version: recordVersion(doc.data()),
      })),
  }
}
export async function getMcpInvoice(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const args = mcpParse(invoiceSchema, input)
  const data = await mcpFinancialData(uid, undefined, args.month)
  const card = data.cards.find((card) => card.id === args.cardId)
  if (!card) throw new McpError('not_found', 'Cartão não encontrado.', 404)
  const payment = await adminDb
    .doc(`users/${uid}/creditCards/${args.cardId}/payments/${args.month}`)
    .get()
  const invoice = financialInvoice(
    data.transactions,
    card,
    args.month,
    payment.exists
      ? (payment.data() as { amount: number; paidAt: unknown })
      : null,
  )
  const rows = invoice.transactions.sort((a, b) => a.id.localeCompare(b.id))
  const start = args.cursor
    ? rows.findIndex((row) => row.id === args.cursor) + 1
    : 0
  if (args.cursor && !start)
    throw new McpError('invalid_cursor', 'Cursor de fatura inválido.')
  const page = rows.slice(start, start + args.limit)
  return {
    ...financeMetadata,
    ...(serializeMcp(invoice) as DocumentData),
    transactions: page,
    nextCursor: rows.length > start + args.limit ? page.at(-1)!.id : null,
  }
}
export async function getMcpBudget(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const { month } = mcpParse(budgetSchema, input)
  const data = await mcpFinancialData(uid, undefined, month)
  const root = adminDb.doc(`users/${uid}/budgets/${month}`)
  const [goal, limits] = await Promise.all([
    root.get(),
    boundedMcpRead(root.collection('limits')),
  ])
  const progress = financialBudget(data.transactions, data.cards, month)
  const amount = goal.data()?.amount ?? null
  return {
    ...financeMetadata,
    month,
    goal: amount,
    savings: progress.savings,
    remaining: amount === null ? null : safeMoney(amount - progress.savings),
    limits: limits.map((doc) => ({
      categoryId: doc.id,
      ...doc.data(),
      actual: progress.expenses[doc.id] ?? 0,
      remaining: doc.data().amount - (progress.expenses[doc.id] ?? 0),
    })),
  }
}
export async function listMcpSeries(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const args = mcpParse(seriesListSchema, input)
  let query = adminDb
    .collection(`users/${uid}/transactionSeries`)
    .orderBy(FieldPath.documentId())
  if (args.cursor) query = query.startAfter(args.cursor)
  const page = await query.limit(args.limit + 1).get()
  const rows = page.docs.slice(0, args.limit)
  return {
    series: rows.map((doc) => ({
      id: doc.id,
      ...(serializeMcp(doc.data()) as DocumentData),
      version: recordVersion(doc.data()),
    })),
    nextCursor: page.size > args.limit ? rows.at(-1)!.id : null,
  }
}
export async function getMcpSeries(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const { id } = mcpParse(getTransactionSchema, input)
  const doc = await adminDb.doc(`users/${uid}/transactionSeries/${id}`).get()
  if (!doc.exists) throw new McpError('not_found', 'Série não encontrada.', 404)
  return {
    id,
    ...(serializeMcp(doc.data()) as DocumentData),
    version: recordVersion(doc.data()),
  }
}
