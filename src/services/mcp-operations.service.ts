import {
  Timestamp,
  type Query,
  type DocumentData,
  type Transaction,
} from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { assertAllowedUid, McpError } from '@/lib/mcp/config'
import { civilDate } from '@/lib/mcp/transaction'
import { MCP_PREVIEW_TTL } from '@/lib/mcp/batch'
import {
  commitOperationsSchema,
  operationScope,
  prepareOperationsSchema,
} from '@/lib/mcp/operations'
import {
  boundedMcpRead,
  mcpParse,
  recordVersion,
  serializeMcp,
} from './mcp-query.service'
import { connectionRef } from './mcp-auth.service'
import {
  planMcpOperations,
  type PlannedWrite,
  type QueryGuard,
} from './mcp-operation-planner'

type Identity = { uid: string; connectionId: string; scopes: string[] }
type Pending = {
  writes: PlannedWrite[]
  dependencies: Record<string, string>
  queries: QueryGuard[]
  completed: number
  ids: string[]
}
async function assertPermissions(
  tx: Transaction,
  identity: Identity,
  required: string[],
) {
  const connection = (
    await tx.get(connectionRef(identity.uid, identity.connectionId))
  ).data()
  if (
    !connection ||
    connection.revoked ||
    connection.expiresAt.toMillis() <= Date.now() ||
    !required.every(
      (scope) =>
        identity.scopes.includes(scope) && connection.scopes.includes(scope),
    )
  )
    throw new McpError(
      'insufficient_scope',
      'Autorize as permissões do módulo antes de continuar.',
      403,
    )
}
function guardHash(plan: Awaited<ReturnType<typeof planMcpOperations>>) {
  return recordVersion({
    operations: plan.views,
    dependencies: plan.dependencies,
    queries: plan.queries,
  })
}
export async function prepareMcpOperations(identity: Identity, input: unknown) {
  const { uid, connectionId } = identity
  assertAllowedUid(uid)
  const args = mcpParse(prepareOperationsSchema, input)
  const scopes = [...new Set(args.operations.map(operationScope))]
  const previewId = `operation-${recordVersion(args.idempotencyKey)}`
  const payloadHash = recordVersion(args.operations)
  const ref = adminDb.doc(`users/${uid}/mcpOperations/${previewId}`)
  const today = civilDate()
  return adminDb.runTransaction(async (tx) => {
    await assertPermissions(tx, identity, scopes)
    const existing = (await tx.get(ref)).data()
    if (existing) {
      if (existing.payloadHash !== payloadHash)
        throw new McpError(
          'idempotency_conflict',
          'A chave já foi usada com outros dados.',
          409,
        )
      if (existing.connectionId !== connectionId)
        throw new McpError(
          'invalid_preview',
          'Prepare novamente nesta conexão.',
        )
      if (existing.expiresAt.toMillis() <= Date.now())
        throw new McpError(
          'preview_expired',
          'A prévia expirou; prepare outra com nova chave.',
        )
      return { ...existing.preview, repeated: true }
    }
    const quotaRef = adminDb.doc(
      `users/${uid}/mcpUsage/previews-${Math.floor(Date.now() / 3_600_000)}`,
    )
    const used = (await tx.get(quotaRef)).data()?.count ?? 0
    if (used >= 20)
      throw new McpError(
        'rate_limit',
        'Limite de 20 prévias por hora atingido.',
        429,
      )
    const plan = await planMcpOperations(
      uid,
      tx,
      args.operations,
      previewId,
      today,
    )
    const expiresAt = Timestamp.fromMillis(Date.now() + MCP_PREVIEW_TTL)
    const preview = {
      previewId,
      previewHash: guardHash(plan),
      operations: plan.views,
      scopes,
      expiresAt: expiresAt.toDate().toISOString(),
      requiresConfirmation: true,
    }
    // Nunca salvar uma prévia que exceda o limite de documento do Firestore.
    if (Buffer.byteLength(JSON.stringify(preview)) > 700_000)
      throw new McpError(
        'preview_too_large',
        'Divida a operação em prévias menores.',
      )
    tx.create(ref, {
      connectionId,
      payloadHash,
      operations: args.operations,
      scopes,
      today,
      preview,
      expiresAt,
      createdAt: Timestamp.now(),
    })
    tx.set(quotaRef, {
      count: used + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * 3_600_000),
    })
    return { ...preview, repeated: false }
  })
}
async function verifyPending(tx: Transaction, uid: string, pending: Pending) {
  for (const [path, expected] of Object.entries(pending.dependencies)) {
    const doc = await tx.get(adminDb.doc(`users/${uid}/${path}`))
    if (recordVersion(doc.exists ? doc.data() : null) !== expected)
      throw new McpError(
        'preview_stale',
        'Um registro mudou durante a operação. Revise o progresso e prepare outra prévia.',
        409,
      )
  }
  for (const guard of pending.queries) {
    let query: Query = adminDb.collection(`users/${uid}/${guard.path}`)
    if (guard.field) query = query.where(guard.field, '==', guard.value)
    const rows = (await boundedMcpRead(query, tx)).map((doc) => ({
      id: doc.id,
      version: recordVersion(doc.data()),
    }))
    if (recordVersion(rows) !== recordVersion(guard.rows))
      throw new McpError(
        'preview_stale',
        'Os vínculos mudaram durante a operação. Prepare outra prévia.',
        409,
      )
  }
}
function materialize(write: PlannedWrite, now: Timestamp): DocumentData | null {
  if (!write.data) return null
  if (write.path.includes('/payments/'))
    return { amount: write.data.amount, paidAt: now }
  if (write.path.startsWith('budgets/'))
    return { ...write.data, updatedAt: now }
  return {
    ...write.data,
    createdAt: write.data.createdAt ?? now,
    updatedAt: now,
  }
}
export async function commitMcpOperations(identity: Identity, input: unknown) {
  const { uid, connectionId } = identity
  assertAllowedUid(uid)
  const args = mcpParse(commitOperationsSchema, input)
  const ref = adminDb.doc(`users/${uid}/mcpOperations/${args.previewId}`)
  // Geração é atômica; cancelamentos grandes continuam com a mesma prévia.
  return adminDb.runTransaction(async (tx) => {
    const operation = (await tx.get(ref)).data()
    if (!operation || operation.connectionId !== connectionId)
      throw new McpError(
        'invalid_preview',
        'Prévia indisponível nesta conexão.',
      )
    await assertPermissions(tx, identity, operation.scopes)
    if (operation.preview.previewHash !== args.previewHash)
      throw new McpError('preview_mismatch', 'Confirme a prévia exata.', 409)
    if (operation.result)
      return {
        ...operation.result,
        operations: operation.preview.operations,
        repeated: true,
      }
    if (operation.expiresAt.toMillis() <= Date.now())
      throw new McpError(
        'preview_expired',
        'A prévia expirou. Revise o progresso e prepare outra.',
      )
    let pending: Pending = operation.pending
    if (!pending) {
      const plan = await planMcpOperations(
        uid,
        tx,
        operation.operations,
        args.previewId,
        operation.today,
      )
      if (guardHash(plan) !== args.previewHash)
        throw new McpError(
          'preview_stale',
          'Os dados ou vínculos mudaram. Prepare e confirme outra prévia.',
          409,
        )
      if (plan.views.some((view) => view.blockers.length))
        throw new McpError(
          'operation_blocked',
          'A prévia contém bloqueios. Revise antes de continuar.',
          409,
        )
      pending = {
        writes: plan.writes,
        dependencies: plan.dependencies,
        queries: plan.queries,
        completed: 0,
        ids: [],
      }
    } else await verifyPending(tx, uid, pending)
    // Geração (até 120 ocorrências + série) é atômica: o cursor nunca avança
    // além de uma ocorrência não gravada. Limpezas grandes usam etapas de 120.
    const chunk = pending.writes.slice(
      0,
      pending.writes.some((write) => write.occurrence) ? 400 : 120,
    )
    const occurrenceCount = chunk.filter((write) => write.occurrence).length
    const quotaRef = adminDb.doc(`users/${uid}/mcpUsage/writes-${civilDate()}`)
    const count = occurrenceCount
      ? ((await tx.get(quotaRef)).data()?.count ?? 0)
      : 0
    if (count + occurrenceCount > 500)
      throw new McpError(
        'rate_limit',
        'Limite diário de lançamentos atingido. Nenhuma etapa adicional foi gravada.',
        429,
      )
    const now = Timestamp.now()
    for (const write of chunk) {
      const target = adminDb.doc(`users/${uid}/${write.path}`)
      const value = materialize(write, now)
      if (value === null) tx.delete(target)
      else if (write.create) tx.create(target, value)
      else tx.set(target, value)
      if (write.path in pending.dependencies)
        pending.dependencies[write.path] = recordVersion(value)
      for (const guard of pending.queries) {
        if (write.path.slice(0, write.path.lastIndexOf('/')) !== guard.path)
          continue
        const id = target.id
        guard.rows = guard.rows.filter((row) => row.id !== id)
        if (value && (!guard.field || value[guard.field] === guard.value))
          guard.rows.push({ id, version: recordVersion(value) })
        guard.rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      }
      if (write.occurrence) pending.ids.push(target.id)
    }
    if (occurrenceCount)
      tx.set(quotaRef, {
        count: count + occurrenceCount,
        expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86_400_000),
      })
    pending.completed += chunk.length
    pending.writes = pending.writes.slice(chunk.length)
    const result = {
      completed: pending.completed,
      remaining: pending.writes.length,
      done: pending.writes.length === 0,
      ids: pending.ids,
    }
    const update: DocumentData = { pending, progress: result }
    if (result.done) {
      update.result = result
      update.committedAt = now
    }
    if (
      Buffer.byteLength(
        JSON.stringify(serializeMcp({ ...operation, ...update })),
      ) > 900_000
    )
      throw new McpError(
        'operation_too_large',
        'A operação excede o armazenamento seguro. Divida os alvos ou revise no aplicativo.',
      )
    tx.update(ref, update)
    return {
      ...result,
      operations: operation.preview.operations,
      repeated: false,
    }
  })
}
