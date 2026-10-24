import {
  FieldPath,
  Timestamp,
  type Query,
  type Transaction,
} from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { assertAllowedUid, hashSecret, McpError } from '@/lib/mcp/config'
import {
  civilDate,
  civilTimestamp,
  normalizeMcpTransaction,
} from '@/lib/mcp/transaction'
import {
  canonicalJson,
  civilDayBounds,
  commitMcpTransactionsSchema,
  duplicateSignature,
  listMcpTransactionsSchema,
  MCP_PREVIEW_TTL,
  prepareMcpTransactionsSchema,
} from '@/lib/mcp/batch'
import {
  assertMcpWriteConnection,
  resolveMcpWrite,
} from './mcp-transaction.service'

type Prepared = Awaited<ReturnType<typeof resolveMcpWrite>>
type Warning = {
  index: number
  existingIds: string[]
  existingCount: number
  existingFingerprint: string
  batchIndexes: number[]
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input)
  if (!parsed.success)
    throw new McpError(
      'invalid_request',
      parsed.error.issues.map((i) => i.message).join(' '),
    )
  return parsed.data
}
const transactions = (uid: string) =>
  adminDb.collection(`users/${uid}/transactions`)

export async function listMcpTransactions(uid: string, input: unknown) {
  assertAllowedUid(uid)
  const args = parse(listMcpTransactionsSchema, input)
  const binding = hashSecret(
    JSON.stringify([uid, args.startDate, args.endDate]),
  )
  let query: Query = transactions(uid)
    .orderBy('date', 'desc')
    .orderBy(FieldPath.documentId(), 'desc')
  if (args.startDate)
    query = query.where(
      'date',
      '>=',
      Timestamp.fromDate(civilDayBounds(args.startDate).start),
    )
  if (args.endDate)
    query = query.where(
      'date',
      '<',
      Timestamp.fromDate(civilDayBounds(args.endDate).end),
    )
  if (args.cursor) {
    try {
      const cursor = z
        .object({
          binding: z.literal(binding),
          seconds: z.number().int(),
          nanoseconds: z.number().int().min(0).max(999999999),
          id: z.string().regex(/^[^/]{1,1500}$/),
        })
        .strict()
        .parse(
          JSON.parse(Buffer.from(args.cursor, 'base64url').toString('utf8')),
        )
      query = query.startAfter(
        new Timestamp(cursor.seconds, cursor.nanoseconds),
        cursor.id,
      )
    } catch {
      throw new McpError(
        'invalid_cursor',
        'Cursor inválido para esta consulta.',
      )
    }
  }
  const snapshot = await query.limit(args.limit + 1).get()
  const page = snapshot.docs.slice(0, args.limit)
  const last = page.at(-1)
  const stamp = last?.data().date as Timestamp | undefined
  const nextCursor =
    snapshot.size > args.limit && last && stamp
      ? Buffer.from(
          JSON.stringify({
            binding,
            seconds: stamp.seconds,
            nanoseconds: stamp.nanoseconds,
            id: last.id,
          }),
        ).toString('base64url')
      : null
  return {
    currency: 'BRL',
    amountUnit: 'centavos',
    timeZone: 'America/Sao_Paulo',
    transactions: page.map((doc) => {
      const value = doc.data()
      return {
        id: doc.id,
        type: value.type,
        amount: value.amount,
        description: value.description,
        date: civilDate(value.date.toDate()),
        categoryId: value.categoryId,
        creditCardId: value.creditCardId ?? null,
        tags: value.tags ?? [],
        notes: value.notes ?? null,
      }
    }),
    nextCursor,
  }
}

async function warnings(
  tx: Transaction,
  uid: string,
  items: Prepared[],
): Promise<Warning[]> {
  const existing = new Map<string, string[]>()
  let scanned = 0
  for (const day of [...new Set(items.map((item) => item.date))]) {
    const bounds = civilDayBounds(day)
    const snapshot = await tx.get(
      transactions(uid)
        .where('date', '>=', Timestamp.fromDate(bounds.start))
        .where('date', '<', Timestamp.fromDate(bounds.end))
        .limit(501 - scanned),
    )
    scanned += snapshot.size
    if (scanned > 500)
      throw new McpError(
        'duplicate_check_limit',
        'Há muitos registros nesse período. Revise manualmente ou reduza o lote.',
      )
    for (const doc of snapshot.docs) {
      const value = doc.data()
      const key = duplicateSignature({
        date: day,
        type: value.type,
        amount: value.amount,
        description: value.description,
      })
      existing.set(key, [...(existing.get(key) ?? []), doc.id])
    }
  }
  return items.flatMap((item, index) => {
    const signature = duplicateSignature(item)
    const existingIds = (existing.get(signature) ?? []).sort()
    const batchIndexes = items.flatMap((other, otherIndex) =>
      otherIndex !== index && duplicateSignature(other) === signature
        ? [otherIndex]
        : [],
    )
    return existingIds.length || batchIndexes.length
      ? [
          {
            index,
            existingIds: existingIds.slice(0, 5),
            existingCount: existingIds.length,
            existingFingerprint: hashSecret(canonicalJson(existingIds)),
            batchIndexes,
          },
        ]
      : []
  })
}

export async function prepareMcpTransactions(
  uid: string,
  connectionId: string,
  input: unknown,
) {
  assertAllowedUid(uid)
  const args = parse(prepareMcpTransactionsSchema, input)
  const payloadHash = hashSecret(
    JSON.stringify([args.source, args.transactions]),
  )
  const previewId = `preview-${hashSecret(args.idempotencyKey)}`
  const ref = adminDb.doc(`users/${uid}/mcpOperations/${previewId}`)
  // A data padrão é congelada na primeira preparação, inclusive em retries após meia-noite.
  const normalized = args.transactions.map(normalizeMcpTransaction)
  return adminDb.runTransaction(async (tx) => {
    await assertMcpWriteConnection(tx, uid, connectionId)
    const previous = (await tx.get(ref)).data()
    if (previous) {
      if (previous.payloadHash !== payloadHash)
        throw new McpError(
          'idempotency_conflict',
          'A chave já foi usada com outros dados.',
          409,
        )
      if (previous.connectionId !== connectionId)
        throw new McpError(
          'invalid_preview',
          'Prepare novamente nesta conexão.',
        )
      if (previous.expiresAt.toMillis() <= Date.now())
        throw new McpError(
          'preview_expired',
          'A prévia expirou. Prepare outra com uma nova chave.',
        )
      return { ...previous.preview, repeated: true }
    }
    const quotaRef = adminDb.doc(
      `users/${uid}/mcpUsage/previews-${Math.floor(Date.now() / 3_600_000)}`,
    )
    const quota = (await tx.get(quotaRef)).data()?.count ?? 0
    if (quota >= 20)
      throw new McpError(
        'rate_limit',
        'Limite de 20 prévias por hora atingido.',
        429,
      )
    const prepared: Prepared[] = []
    for (const item of normalized)
      prepared.push(await resolveMcpWrite(tx, uid, item))
    const duplicates = await warnings(tx, uid, prepared)
    const previewHash = hashSecret(
      canonicalJson([args.source, prepared, duplicates]),
    )
    const expiresAt = Timestamp.fromMillis(Date.now() + MCP_PREVIEW_TTL)
    // Totais em strings decimais evitam overflow ao somar valores individualmente válidos.
    const totals = { expense: '0', income: '0', investment: '0' }
    for (const item of prepared)
      totals[item.type] = (
        BigInt(totals[item.type]) + BigInt(item.amount)
      ).toString()
    const preview = {
      previewId,
      previewHash,
      source: args.source,
      transactions: prepared,
      duplicates,
      totals,
      currency: 'BRL',
      amountUnit: 'centavos',
      expiresAt: expiresAt.toDate().toISOString(),
      requiresConfirmation: true,
    }
    tx.create(ref, {
      payloadHash,
      connectionId,
      preview,
      expiresAt,
      createdAt: Timestamp.now(),
    })
    tx.set(quotaRef, {
      count: quota + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * 3_600_000),
    })
    return { ...preview, repeated: false }
  })
}

export async function commitMcpTransactions(
  uid: string,
  connectionId: string,
  input: unknown,
) {
  assertAllowedUid(uid)
  const args = parse(commitMcpTransactionsSchema, input)
  const ref = adminDb.doc(`users/${uid}/mcpOperations/${args.previewId}`)
  return adminDb.runTransaction(async (tx) => {
    await assertMcpWriteConnection(tx, uid, connectionId)
    const operation = (await tx.get(ref)).data()
    if (!operation || operation.connectionId !== connectionId)
      throw new McpError(
        'invalid_preview',
        'Prévia indisponível nesta conexão.',
      )
    const preview = operation.preview as {
      previewHash: string
      transactions: Prepared[]
      duplicates: Warning[]
    }
    if (preview.previewHash !== args.previewHash)
      throw new McpError('preview_mismatch', 'Confirme a prévia exata.', 409)
    // O resultado permanece idempotente mesmo após expirar a prévia ou editar os lançamentos.
    if (operation.result) return { ...operation.result, repeated: true }
    if (operation.expiresAt.toMillis() <= Date.now())
      throw new McpError(
        'preview_expired',
        'A prévia expirou. Prepare outra com uma nova chave.',
      )
    const prepared: Prepared[] = []
    for (const item of preview.transactions) {
      const { cardClosingDay: ignored, ...transaction } = item
      void ignored
      prepared.push(await resolveMcpWrite(tx, uid, transaction))
    }
    if (canonicalJson(prepared) !== canonicalJson(preview.transactions))
      throw new McpError(
        'preview_stale',
        'As referências mudaram. Prepare uma nova prévia.',
        409,
      )
    const duplicates = await warnings(tx, uid, prepared)
    if (canonicalJson(duplicates) !== canonicalJson(preview.duplicates))
      throw new McpError(
        'preview_stale',
        'As possíveis duplicatas mudaram. Prepare uma nova prévia.',
        409,
      )
    if (duplicates.length && !args.allowDuplicates)
      throw new McpError(
        'duplicates_require_confirmation',
        'Confirme explicitamente as possíveis duplicatas antes de gravar.',
        409,
      )
    const quotaRef = adminDb.doc(`users/${uid}/mcpUsage/writes-${civilDate()}`)
    const count = (await tx.get(quotaRef)).data()?.count ?? 0
    if (count + prepared.length > 500)
      throw new McpError(
        'rate_limit',
        'O lote ultrapassa o limite de 500 lançamentos por dia.',
        429,
      )
    const now = Timestamp.now()
    const records = prepared.map((item, index) => ({
      id: `mcp-${args.previewId}-${index}`,
      ...item,
    }))
    for (const { id, ...item } of records)
      tx.create(transactions(uid).doc(id), {
        ...item,
        date: Timestamp.fromDate(civilTimestamp(item.date)),
        createdAt: now,
        updatedAt: now,
      })
    const result = {
      ids: records.map((item) => item.id),
      transactions: records,
      count: records.length,
    }
    tx.update(ref, { result, committedAt: now })
    tx.set(quotaRef, {
      count: count + records.length,
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86_400_000),
    })
    return { ...result, repeated: false }
  })
}
