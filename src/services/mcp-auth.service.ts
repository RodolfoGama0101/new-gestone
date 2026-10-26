import { createHash } from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import {
  assertAllowedUid,
  equalSecret,
  hashSecret,
  McpError,
  mcpConfig,
  newSecret,
  type AuthorizationRequest,
} from '@/lib/mcp/config'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const secretRef = (uid: string, secret: string) =>
  adminDb.doc(`users/${uid}/mcpSecrets/${hashSecret(secret)}`)
export const connectionRef = (uid: string, id: string) =>
  adminDb.doc(`users/${uid}/mcpConnections/${id}`)

async function findSecret(secret: string, status = 400) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(secret))
    throw new McpError('invalid_grant', 'Autorização inválida.', status)
  for (const uid of mcpConfig().uids) {
    const ref = secretRef(uid, secret)
    if ((await ref.get()).exists) return { uid, ref }
  }
  throw new McpError('invalid_grant', 'Autorização inválida.', status)
}

export async function issueCode(uid: string, input: AuthorizationRequest) {
  assertAllowedUid(uid)
  const code = newSecret()
  const now = Date.now()
  await adminDb.runTransaction(async (tx) => {
    const quota = adminDb.doc(
      `users/${uid}/mcpUsage/authorize-${Math.floor(now / (60 * MINUTE))}`,
    )
    const count = (await tx.get(quota)).data()?.count ?? 0
    if (count >= 20)
      throw new McpError(
        'rate_limit',
        'Muitas autorizações. Tente mais tarde.',
        429,
      )
    tx.set(quota, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(now + 2 * 60 * MINUTE),
    })
    tx.create(secretRef(uid, code), {
      ...input,
      kind: 'code',
      used: false,
      expiresAt: Timestamp.fromMillis(now + 5 * MINUTE),
    })
  })
  const redirect = new URL(input.redirectUri)
  redirect.searchParams.set('code', code)
  redirect.searchParams.set('state', input.state)
  redirect.searchParams.set('iss', mcpConfig().origin)
  return redirect.toString()
}

export async function exchangeToken(params: URLSearchParams) {
  const config = mcpConfig()
  for (const key of new Set(params.keys())) {
    if (params.getAll(key).length !== 1)
      throw new McpError('invalid_request', 'Parâmetro repetido.')
  }
  if (
    params.get('client_id') !== config.clientId ||
    !equalSecret(params.get('client_secret') ?? '', config.clientSecret)
  ) {
    throw new McpError('invalid_client', 'Cliente OAuth inválido.', 401)
  }
  if (params.get('resource') !== config.resource)
    throw new McpError('invalid_target', 'Recurso inválido.')
  const grant = params.get('grant_type')
  if (grant !== 'authorization_code' && grant !== 'refresh_token')
    throw new McpError('unsupported_grant_type', 'Fluxo não suportado.')
  const { uid, ref } = await findSecret(
    params.get(grant === 'authorization_code' ? 'code' : 'refresh_token') ?? '',
  )
  const user = await adminAuth.getUser(uid)
  if (user.disabled) throw new McpError('invalid_grant', 'Conta indisponível.')
  const access = newSecret(),
    refresh = newSecret(),
    newConnection = newSecret()
  const result = await adminDb.runTransaction(async (tx) => {
    const now = Date.now()
    const data = (await tx.get(ref)).data()
    if (
      !data ||
      data.kind !== (grant === 'authorization_code' ? 'code' : 'refresh') ||
      data.clientId !== config.clientId ||
      data.resource !== config.resource ||
      data.expiresAt.toMillis() <= now
    ) {
      throw new McpError(
        'invalid_grant',
        'Autorização expirada ou inválida.',
        400,
      )
    }
    const id: string =
      grant === 'authorization_code' ? newConnection : data.connectionId
    const connection = connectionRef(uid, id)
    const previous = (await tx.get(connection)).data()
    if (grant === 'authorization_code') {
      const connections = await tx.get(
        adminDb.collection(`users/${uid}/mcpConnections`).limit(100),
      )
      if (connections.size >= 100)
        throw new McpError(
          'rate_limit',
          'Limite de conexões atingido. Revogue o acesso e tente novamente.',
          429,
        )
    }
    if (
      grant === 'refresh_token' &&
      (!previous || previous.revoked || previous.expiresAt.toMillis() <= now)
    ) {
      throw new McpError('invalid_grant', 'Conexão revogada ou expirada.')
    }
    if (data.used) {
      if (grant === 'refresh_token') tx.update(connection, { revoked: true })
      return null
    }
    if (grant === 'authorization_code') {
      const verifier = params.get('code_verifier') ?? ''
      const challenge = createHash('sha256')
        .update(verifier)
        .digest('base64url')
      if (
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        !equalSecret(challenge, data.challenge) ||
        params.get('redirect_uri') !== data.redirectUri
      ) {
        throw new McpError('invalid_grant', 'PKCE ou callback inválido.')
      }
    }
    if (params.has('scope') && params.get('scope') !== data.scopes.join(' '))
      throw new McpError('invalid_scope', 'Escopo inválido.')
    const expiresAt =
      previous?.expiresAt ?? Timestamp.fromMillis(now + 30 * DAY)
    tx.update(ref, { used: true })
    if (grant === 'authorization_code')
      tx.create(connection, {
        clientId: config.clientId,
        scopes: data.scopes,
        revoked: false,
        createdAt: Timestamp.fromMillis(now),
        expiresAt,
      })
    const common = {
      clientId: config.clientId,
      resource: config.resource,
      connectionId: id,
      scopes: data.scopes,
    }
    tx.create(secretRef(uid, access), {
      ...common,
      kind: 'access',
      expiresAt: Timestamp.fromMillis(
        Math.min(now + 60 * MINUTE, expiresAt.toMillis()),
      ),
    })
    tx.create(secretRef(uid, refresh), {
      ...common,
      kind: 'refresh',
      used: false,
      expiresAt,
    })
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: 'Bearer',
      expires_in: Math.min(
        3600,
        Math.floor((expiresAt.toMillis() - now) / 1000),
      ),
      scope: data.scopes.join(' '),
    }
  })
  if (!result) throw new McpError('invalid_grant', 'Autorização já utilizada.')
  return result
}

export async function verifyMcpToken(token: string) {
  const { uid, ref } = await findSecret(token, 401)
  const data = (await ref.get()).data()
  if (
    !data ||
    data.kind !== 'access' ||
    data.expiresAt.toMillis() <= Date.now() ||
    data.resource !== mcpConfig().resource ||
    data.clientId !== mcpConfig().clientId
  ) {
    throw new McpError('invalid_token', 'Token inválido.', 401)
  }
  const connection = (await connectionRef(uid, data.connectionId).get()).data()
  if (
    !connection ||
    connection.revoked ||
    connection.expiresAt.toMillis() <= Date.now()
  )
    throw new McpError('invalid_token', 'Conexão revogada.', 401)
  try {
    if ((await adminAuth.getUser(uid)).disabled) throw new Error('disabled')
  } catch {
    throw new McpError('invalid_token', 'Conta indisponível.', 401)
  }
  return {
    uid,
    connectionId: data.connectionId as string,
    scopes: data.scopes as string[],
  }
}

export async function consumeToolQuota(
  uid: string,
  id: string,
  scope: string | string[],
) {
  assertAllowedUid(uid)
  const now = Date.now()
  await adminDb.runTransaction(async (tx) => {
    const connection = (await tx.get(connectionRef(uid, id))).data()
    if (
      !connection ||
      connection.revoked ||
      connection.expiresAt.toMillis() <= now ||
      !(Array.isArray(scope) ? scope : [scope]).every((item) =>
        connection.scopes.includes(item),
      )
    ) {
      throw new McpError('insufficient_scope', 'Conexão sem permissão.', 403)
    }
    const ref = adminDb.doc(
      `users/${uid}/mcpUsage/tools-${Math.floor(now / (60 * MINUTE))}`,
    )
    const count = (await tx.get(ref)).data()?.count ?? 0
    if (count >= 100)
      throw new McpError(
        'rate_limit',
        'Limite de 100 chamadas por hora atingido.',
        429,
      )
    tx.set(ref, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(now + 2 * 60 * MINUTE),
    })
  })
}

export async function integrationConnections(uid: string) {
  assertAllowedUid(uid)
  const snapshot = await adminDb
    .collection(`users/${uid}/mcpConnections`)
    .limit(100)
    .get()
  return snapshot.docs
    .filter(
      (item) =>
        !item.data().revoked && item.data().expiresAt.toMillis() > Date.now(),
    )
    .map((item) => ({
      id: item.id,
      createdAt: item.data().createdAt.toDate().toISOString(),
      expiresAt: item.data().expiresAt.toDate().toISOString(),
    }))
}

export async function revokeConnections(uid: string) {
  assertAllowedUid(uid)
  const refs = (
    await adminDb.collection(`users/${uid}/mcpConnections`).limit(100).get()
  ).docs
  const batch = adminDb.batch()
  // Remover a autorização mantém os tokens antigos inválidos e libera reconexão.
  refs.forEach((ref) => batch.delete(ref.ref))
  await batch.commit()
}

// Sem TTL pago ou cron: uma limpeza pequena por chamada, sempre fora do caminho crítico.
export async function cleanupMcpSecrets(uid: string) {
  for (const name of ['mcpSecrets', 'mcpUsage', 'mcpConnections']) {
    const expired = await adminDb
      .collection(`users/${uid}/${name}`)
      .where('expiresAt', '<', Timestamp.now())
      .limit(10)
      .get()
    if (!expired.empty) {
      const batch = adminDb.batch()
      expired.docs.forEach((item) => batch.delete(item.ref))
      await batch.commit()
    }
  }
}
