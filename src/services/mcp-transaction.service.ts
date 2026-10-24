import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { assertAllowedUid, hashSecret, McpError } from '@/lib/mcp/config'
import {
  civilDate,
  civilTimestamp,
  createMcpTransactionSchema,
  MCP_TIME_ZONE,
  normalizeMcpTransaction,
} from '@/lib/mcp/transaction'
import { connectionRef } from './mcp-auth.service'

export async function getMcpContext(uid: string) {
  assertAllowedUid(uid)
  const [categories, cards] = await Promise.all([
    adminDb.collection(`users/${uid}/categories`).get(),
    adminDb.collection(`users/${uid}/creditCards`).get(),
  ])
  return {
    today: civilDate(),
    timeZone: MCP_TIME_ZONE,
    currency: 'BRL',
    amountUnit: 'centavos',
    categories: categories.docs
      .filter((item) => !item.data().archived)
      .map((item) => ({
        id: item.id,
        name: item.data().name,
        type: item.data().type,
      })),
    cards: cards.docs
      .filter((item) => !item.data().archived && item.data().isActive === true)
      .map((item) => ({
        id: item.id,
        name: item.data().name,
        closingDay: item.data().closingDay,
      })),
  }
}

export async function createMcpTransaction(
  uid: string,
  connectionId: string,
  input: unknown,
) {
  assertAllowedUid(uid)
  const parsed = createMcpTransactionSchema.safeParse(input)
  if (!parsed.success)
    throw new McpError(
      'invalid_transaction',
      parsed.error.issues.map((issue) => issue.message).join(' '),
    )
  const original = parsed.data.transaction
  // O hash da entrada preserva idempotência mesmo se um retry sem data cruzar meia-noite.
  const payloadHash = hashSecret(JSON.stringify(original))
  const data = normalizeMcpTransaction(original)
  const requestId = hashSecret(parsed.data.idempotencyKey)
  const operation = adminDb.doc(`users/${uid}/mcpOperations/${requestId}`)
  const record = adminDb.doc(`users/${uid}/transactions/mcp-${requestId}`)
  return adminDb.runTransaction(async (tx) => {
    const connection = (await tx.get(connectionRef(uid, connectionId))).data()
    if (
      !connection ||
      connection.revoked ||
      connection.expiresAt.toMillis() <= Date.now() ||
      !connection.scopes.includes('transactions:write')
    ) {
      throw new McpError('insufficient_scope', 'Conexão sem permissão.', 403)
    }
    const previous = (await tx.get(operation)).data()
    if (previous) {
      if (previous.payloadHash !== payloadHash)
        throw new McpError(
          'idempotency_conflict',
          'A chave já foi usada com outros dados.',
          409,
        )
      return { ...previous.result, repeated: true }
    }
    const category = (
      await tx.get(adminDb.doc(`users/${uid}/categories/${data.categoryId}`))
    ).data()
    if (
      !category ||
      category.archived ||
      ![data.type, 'both'].includes(category.type)
    )
      throw new McpError(
        'invalid_category',
        'Escolha uma categoria ativa compatível.',
      )
    let closingDay: number | null = null
    if (data.creditCardId) {
      if (data.type !== 'expense')
        throw new McpError(
          'invalid_card',
          'Cartão só pode ser usado em despesas.',
        )
      const card = (
        await tx.get(
          adminDb.doc(`users/${uid}/creditCards/${data.creditCardId}`),
        )
      ).data()
      if (
        !card ||
        card.archived ||
        card.isActive !== true ||
        !Number.isInteger(card.closingDay) ||
        card.closingDay < 1 ||
        card.closingDay > 31
      ) {
        throw new McpError('invalid_card', 'Este cartão não está disponível.')
      }
      closingDay = card.closingDay
    }
    const quota = adminDb.doc(`users/${uid}/mcpUsage/writes-${civilDate()}`)
    const used = (await tx.get(quota)).data()?.count ?? 0
    if (used >= 500)
      throw new McpError(
        'rate_limit',
        'Limite de 500 lançamentos por dia atingido.',
        429,
      )
    const now = Timestamp.now()
    const result = { id: record.id, ...data, cardClosingDay: closingDay }
    tx.create(record, {
      ...data,
      date: Timestamp.fromDate(civilTimestamp(data.date)),
      cardClosingDay: closingDay,
      createdAt: now,
      updatedAt: now,
    })
    tx.create(operation, { payloadHash, result, createdAt: now })
    tx.set(quota, {
      count: used + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86_400_000),
    })
    return { ...result, repeated: false }
  })
}
