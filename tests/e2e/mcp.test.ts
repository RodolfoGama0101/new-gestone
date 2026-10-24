import {
  test,
  expect,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test'
import { createHash } from 'node:crypto'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
)
  throw new Error('Use npm run test:e2e, somente com emuladores.')
const app = getApps()[0] ?? initializeApp({ projectId: 'demo-gestone-e2e' })
const auth = getAuth(app),
  db = getFirestore(app)
const uid = 'demo-mcp-owner'
const verifier = 'v'.repeat(64)
const challenge = createHash('sha256').update(verifier).digest('base64url')
const redirectUri = 'https://example.test/oauth/callback'
const origin = 'http://localhost:3102'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

function query() {
  return new URLSearchParams({
    response_type: 'code',
    client_id: 'demo-mcp-client',
    redirect_uri: redirectUri,
    resource: `${origin}/api/mcp`,
    state: 'demo-state',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })
}

async function session(request: APIRequestContext, userId = uid) {
  const custom = await auth.createCustomToken(userId)
  const response = await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-api-key',
    { data: { token: custom, returnSecureToken: true } },
  )
  const { idToken } = await response.json()
  expect(
    (
      await request.post('/api/auth/session', {
        data: { token: idToken },
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBe(true)
}

async function code(request: APIRequestContext) {
  const response = await request.post('/api/mcp/oauth/authorize', {
    data: { query: query().toString() },
    headers: { Origin: origin },
  })
  expect(response.ok(), await response.text()).toBe(true)
  const callback = new URL((await response.json()).redirect)
  expect(callback.searchParams.get('state')).toBe('demo-state')
  expect(callback.searchParams.get('iss')).toBe(origin)
  return callback.searchParams.get('code')!
}

function token(request: APIRequestContext, params: Record<string, string>) {
  return request.post('/api/mcp/oauth/token', {
    form: {
      client_id: 'demo-mcp-client',
      resource: `${origin}/api/mcp`,
      ...params,
    },
  })
}

async function parseRpc(response: APIResponse) {
  const text = await response.text()
  expect(response.ok(), text).toBe(true)
  if (response.headers()['content-type']?.includes('application/json'))
    return JSON.parse(text)
  const data = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
  return data.find((item) => 'result' in item || 'error' in item)
}

async function rpc(
  request: APIRequestContext,
  access: string,
  method: string,
  params: unknown,
) {
  return parseRpc(
    await request.post('/api/mcp', {
      headers: {
        Authorization: `Bearer ${access}`,
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-03-26',
      },
      data: { jsonrpc: '2.0', id: 1, method, params },
    }),
  )
}

async function tool(
  request: APIRequestContext,
  access: string,
  name: string,
  args: unknown = {},
) {
  const response = await rpc(request, access, 'tools/call', {
    name,
    arguments: args,
  })
  return {
    isError: response.result?.isError,
    data: JSON.parse(response.result.content[0].text),
  }
}

test('MCP privado: OAuth, PKCE, concorrência, regras financeiras, quotas e revogação', async ({
  request,
  page,
}) => {
  test.setTimeout(180000)
  await db.recursiveDelete(db.doc(`users/${uid}`))
  await auth.deleteUser(uid).catch(() => undefined)
  await auth.createUser({
    uid,
    email: 'mcp-owner@example.test',
    password: 'TesteSeguro@123',
  })
  const now = Timestamp.now()
  await db
    .doc(`users/${uid}/categories/food`)
    .set({ name: 'Alimentação', type: 'expense', archived: false })
  await db
    .doc(`users/${uid}/categories/salary`)
    .set({ name: 'Salário', type: 'income', archived: false })
  await db
    .doc(`users/${uid}/categories/investment`)
    .set({ name: 'Aportes', type: 'investment', archived: false })
  await db
    .doc(`users/${uid}/creditCards/card`)
    .set({ name: 'Cartão', closingDay: 20, isActive: true, archived: false })

  const metadata = await request.get('/.well-known/oauth-authorization-server')
  expect((await metadata.json()).code_challenge_methods_supported).toEqual([
    'S256',
  ])
  expect(
    (await request.get('/.well-known/oauth-protected-resource')).ok(),
  ).toBe(true)
  const anonymous = await request.post('/api/mcp', { data: {} })
  expect(anonymous.status()).toBe(401)
  expect(anonymous.headers()['www-authenticate']).toContain(
    'oauth-protected-resource',
  )

  await page.goto(`/oauth/authorize?${query()}`)
  await expect(
    page.getByRole('heading', { name: 'Conectar ChatGPT ao GestOne' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Entrar no GestOne (nova aba)' }),
  ).toBeVisible()
  await session(request)
  const missingOrigin = await request.post('/api/mcp/oauth/authorize', {
    data: { query: query().toString() },
  })
  expect(missingOrigin.status()).toBe(403)
  const badQuery = query()
  badQuery.set('redirect_uri', 'https://attacker.example.test')
  expect(
    (
      await request.post('/api/mcp/oauth/authorize', {
        data: { query: badQuery.toString() },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(400)

  const firstCode = await code(request)
  const exchange = {
    grant_type: 'authorization_code',
    code: firstCode,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  }
  expect(
    (await token(request, { ...exchange, code_verifier: 'bad' })).status(),
  ).toBe(400)
  const responses = await Promise.all([
    token(request, exchange),
    token(request, exchange),
  ])
  expect(responses.map((item) => item.status()).sort()).toEqual([200, 400])
  const issued = await responses.find((item) => item.status() === 200)!.json()
  const access = issued.access_token as string
  const stored = (
    await db.doc(`users/${uid}/mcpSecrets/${hash(access)}`).get()
  ).data()!
  expect(JSON.stringify(stored)).not.toContain(access)

  const handshake = await rpc(request, access, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'gestone-e2e', version: '1.0.0' },
  })
  expect(handshake.result.serverInfo.name).toBe('gestone')
  const tools = await rpc(request, access, 'tools/list', {})
  expect(
    tools.result.tools.map((item: { name: string }) => item.name).sort(),
  ).toEqual([
    'commit_transactions',
    'create_transaction',
    'get_context',
    'list_transactions',
    'prepare_transactions',
  ])
  const context = await tool(request, access, 'get_context')
  expect(context.data.timeZone).toBe('America/Sao_Paulo')
  expect(context.data.categories).toHaveLength(3)
  const input = {
    idempotencyKey: 'demo-operation-market',
    transaction: {
      type: 'expense',
      amount: 4000,
      description: 'Mercado',
      categoryId: 'food',
      creditCardId: 'card',
      date: '2026-10-21',
    },
  }
  const writes = await Promise.all([
    tool(request, access, 'create_transaction', input),
    tool(request, access, 'create_transaction', input),
  ])
  expect(writes.every((item) => !item.isError)).toBe(true)
  expect(writes[0].data.id).toBe(writes[1].data.id)
  expect((await db.collection(`users/${uid}/transactions`).get()).size).toBe(1)
  const saved = (
    await db.doc(`users/${uid}/transactions/${writes[0].data.id}`).get()
  ).data()!
  expect(saved.amount).toBe(4000)
  expect(saved.cardClosingDay).toBe(20)
  expect(saved.date.toDate().toISOString()).toBe('2026-10-21T15:00:00.000Z')
  const changed = await tool(request, access, 'create_transaction', {
    ...input,
    transaction: { ...input.transaction, amount: 5000 },
  })
  expect(changed.data.error).toBe('idempotency_conflict')
  const salary = await tool(request, access, 'create_transaction', {
    idempotencyKey: 'demo-operation-salary',
    transaction: {
      type: 'income',
      amount: 400000,
      description: 'Salário',
      categoryId: 'salary',
    },
  })
  expect(salary.data.amount).toBe(400000)
  expect(salary.data.creditCardId).toBeNull()
  const investment = await tool(request, access, 'create_transaction', {
    idempotencyKey: 'demo-operation-investment',
    transaction: {
      type: 'investment',
      amount: 50000,
      description: 'Aporte de teste',
      categoryId: 'investment',
    },
  })
  expect(investment.data.type).toBe('investment')
  expect(investment.data.amount).toBe(50000)
  await db.doc(`users/${uid}/categories/food`).update({ archived: true })
  expect(
    (
      await tool(request, access, 'create_transaction', {
        ...input,
        idempotencyKey: 'demo-operation-archive',
      })
    ).data.error,
  ).toBe('invalid_category')

  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  await db.doc(`users/${uid}/mcpUsage/writes-${day}`).set({
    count: 500,
    expiresAt: Timestamp.fromMillis(Date.now() + 86_400_000),
  })
  expect(
    (
      await tool(request, access, 'create_transaction', {
        idempotencyKey: 'demo-operation-daily-limit',
        transaction: {
          type: 'income',
          amount: 100,
          categoryId: 'salary',
          description: 'Receita limitada',
        },
      })
    ).data.error,
  ).toBe('rate_limit')
  expect((await db.collection(`users/${uid}/transactions`).get()).size).toBe(3)
  await db.doc(`users/${uid}/categories/food`).update({ archived: false })
  await db.doc(`users/${uid}/creditCards/card`).update({ isActive: false })
  expect(
    (
      await tool(request, access, 'create_transaction', {
        ...input,
        idempotencyKey: 'demo-operation-inactive',
      })
    ).data.error,
  ).toBe('invalid_card')
  expect(
    (
      await tool(request, access, 'create_transaction', {
        ...input,
        idempotencyKey: 'demo-operation-crossuser',
        transaction: {
          ...input.transaction,
          categoryId: 'someone-elses-category',
        },
      })
    ).data.error,
  ).toBe('invalid_category')

  const quotaPath = `users/${uid}/mcpUsage/tools-${Math.floor(Date.now() / 3_600_000)}`
  await db.doc(quotaPath).set({
    count: 100,
    expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000),
  })
  expect((await tool(request, access, 'get_context')).data.error).toBe(
    'rate_limit',
  )
  await db
    .doc(quotaPath)
    .set({ count: 0, expiresAt: Timestamp.fromMillis(Date.now() + 3_600_000) })
  const refreshed = await token(request, {
    grant_type: 'refresh_token',
    refresh_token: issued.refresh_token,
  })
  expect(refreshed.status()).toBe(200)
  const rotated = await refreshed.json()
  expect(
    (
      await token(request, {
        grant_type: 'refresh_token',
        refresh_token: issued.refresh_token,
      })
    ).status(),
  ).toBe(400)
  expect(
    (
      await request.post('/api/mcp', {
        headers: { Authorization: `Bearer ${rotated.access_token}` },
        data: {},
      })
    ).status(),
  ).toBe(401)

  const second = await token(request, {
    grant_type: 'authorization_code',
    code: await code(request),
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })
  const secondTokens = await second.json()
  await db
    .doc(`users/${uid}/mcpSecrets/${hash(secondTokens.access_token)}`)
    .update({ expiresAt: now })
  expect(
    (
      await request.post('/api/mcp', {
        headers: { Authorization: `Bearer ${secondTokens.access_token}` },
        data: {},
      })
    ).status(),
  ).toBe(401)
  expect(
    (
      await request.delete('/api/mcp/connections', {
        headers: { Origin: origin },
      })
    ).ok(),
  ).toBe(true)
  expect(
    (
      await token(request, {
        grant_type: 'refresh_token',
        refresh_token: secondTokens.refresh_token,
      })
    ).status(),
  ).toBe(400)
  expect(
    (await (await request.get('/api/mcp/connections')).json()).connections,
  ).toEqual([])

  // Fluxo real no navegador: consentimento e revogação nas configurações.
  await page.goto('/login')
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('mcp-owner@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('TesteSeguro@123')
  await page
    .getByRole('button', { name: 'Entrar na conta', exact: true })
    .click()
  await expect(page).toHaveURL(`${origin}/`, { timeout: 90000 })
  await page.route('https://example.test/oauth/callback**', (route) =>
    route.fulfill({ status: 200, body: 'Callback fictício recebido.' }),
  )
  await page.goto(`/oauth/authorize?${query()}`)
  await page.getByRole('button', { name: 'Autorizar conexão' }).click()
  await expect(page).toHaveURL(/https:\/\/example\.test\/oauth\/callback/)
  const browserCode = new URL(page.url()).searchParams.get('code')!
  const browserTokens = await (
    await token(request, {
      grant_type: 'authorization_code',
      code: browserCode,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  ).json()
  expect(browserTokens.access_token).toBeTruthy()
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Integrações', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Revogar acesso do ChatGPT' }),
  ).toBeEnabled()
  await page.setViewportSize({ width: 320, height: 900 })
  await page.screenshot({
    path: 'test-results/mcp-integrations-320.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Revogar acesso do ChatGPT' }).click()
  await expect(page.getByText('Nenhuma conexão ativa.')).toBeVisible()
  expect(
    (
      await request.post('/api/mcp', {
        headers: { Authorization: `Bearer ${browserTokens.access_token}` },
        data: {},
      })
    ).status(),
  ).toBe(401)
  await auth
    .createUser({ uid: 'demo-mcp-other', email: 'mcp-other@example.test' })
    .catch(() => undefined)
  await session(request, 'demo-mcp-other')
  expect((await request.get('/api/mcp/connections')).status()).toBe(403)
})

test('MCP: consulta e lotes de comprovantes exigem prévia, confirmação e commit atômico', async ({
  request,
}) => {
  test.setTimeout(180000)
  await db.recursiveDelete(db.doc(`users/${uid}`))
  await auth.deleteUser(uid).catch(() => undefined)
  await auth.createUser({
    uid,
    email: 'mcp-owner@example.test',
    password: 'TesteSeguro@123',
  })
  await db
    .doc(`users/${uid}/categories/food`)
    .set({ name: 'Alimentação', type: 'expense', archived: false })
  await db
    .doc(`users/${uid}/categories/salary`)
    .set({ name: 'Salário', type: 'income', archived: false })
  await db
    .doc(`users/${uid}/creditCards/card`)
    .set({ name: 'Cartão', closingDay: 20, isActive: true })
  await session(request)
  const issued = await (
    await token(request, {
      grant_type: 'authorization_code',
      code: await code(request),
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  ).json()
  const access = issued.access_token
  const collection = db.collection(`users/${uid}/transactions`)
  const item = {
    type: 'expense',
    amount: 4000,
    description: 'Mercado',
    categoryId: 'food',
    date: '2026-10-24',
  }
  const prepare = (key: string, transactions: unknown[] = [item]) =>
    tool(request, access, 'prepare_transactions', {
      idempotencyKey: key,
      source: 'receipts',
      transactions,
    })
  const commit = (
    preview: { previewId: string; previewHash: string },
    extra = {},
  ) =>
    tool(request, access, 'commit_transactions', {
      previewId: preview.previewId,
      previewHash: preview.previewHash,
      confirmed: true,
      ...extra,
    })
  const first = (
    await prepare('batch-receipts-test-1234', [
      item,
      {
        ...item,
        type: 'income',
        categoryId: 'salary',
        description: 'Receita',
        amount: 5000,
      },
    ])
  ).data
  expect(first.source).toBe('receipts')
  expect(first.totals).toEqual({
    expense: '4000',
    income: '5000',
    investment: '0',
  })
  expect(first.requiresConfirmation).toBe(true)
  expect((await collection.get()).size).toBe(0)
  const repeated = await prepare('batch-receipts-test-1234', [
    item,
    {
      ...item,
      type: 'income',
      categoryId: 'salary',
      description: 'Receita',
      amount: 5000,
    },
  ])
  expect(repeated.data.previewHash).toBe(first.previewHash)
  expect(repeated.data.repeated).toBe(true)
  expect(
    (await prepare('batch-receipts-test-1234', [{ ...item, amount: 4100 }]))
      .data.error,
  ).toBe('idempotency_conflict')
  const noConfirmation = await rpc(request, access, 'tools/call', {
    name: 'commit_transactions',
    arguments: {
      previewId: first.previewId,
      previewHash: first.previewHash,
      confirmed: false,
    },
  })
  expect(Boolean(noConfirmation.error || noConfirmation.result?.isError)).toBe(
    true,
  )
  expect(
    (await commit(first, { previewHash: '0'.repeat(64) })).data.error,
  ).toBe('preview_mismatch')
  const committed = await Promise.all([commit(first), commit(first)])
  expect(committed.every((r) => !r.isError)).toBe(true)
  expect(committed[0].data.ids).toEqual(committed[1].data.ids)
  expect((await collection.get()).size).toBe(2)
  // O resultado idempotente sobrevive a edição posterior e expiração.
  await collection.doc(committed[0].data.ids[0]).update({ amount: 4100 })
  await db
    .doc(`users/${uid}/mcpOperations/${first.previewId}`)
    .update({ expiresAt: Timestamp.fromMillis(0) })
  expect((await commit(first)).data.ids).toEqual(committed[0].data.ids)
  await collection.doc(committed[0].data.ids[0]).update({ amount: 4000 })
  const duplicate = (await prepare('batch-duplicates-test-1234', [item, item]))
    .data
  expect(duplicate.duplicates).toHaveLength(2)
  expect(duplicate.duplicates[0].existingIds).toContain(
    committed[0].data.ids[0],
  )
  expect(duplicate.duplicates[0].batchIndexes).toEqual([1])
  expect((await commit(duplicate)).data.error).toBe(
    'duplicates_require_confirmation',
  )
  expect((await collection.get()).size).toBe(2)
  expect((await commit(duplicate, { allowDuplicates: true })).data.count).toBe(
    2,
  )

  // Cursor por data + ID: quatro registros no mesmo instante não se repetem entre páginas.
  await db
    .doc('users/demo-mcp-other/transactions/private')
    .set({
      ...item,
      date: Timestamp.fromDate(new Date('2026-10-24T15:00:00Z')),
    })
  const page1 = (
    await tool(request, access, 'list_transactions', {
      startDate: '2026-10-24',
      endDate: '2026-10-24',
      limit: 2,
    })
  ).data
  expect(page1.transactions).toHaveLength(2)
  const page2 = (
    await tool(request, access, 'list_transactions', {
      startDate: '2026-10-24',
      endDate: '2026-10-24',
      limit: 2,
      cursor: page1.nextCursor,
    })
  ).data
  expect(page2.transactions).toHaveLength(2)
  expect(
    new Set(
      [...page1.transactions, ...page2.transactions].map(
        (r: { id: string }) => r.id,
      ),
    ).size,
  ).toBe(4)
  expect(page2.nextCursor).toBeNull()
  expect(
    (
      await tool(request, access, 'list_transactions', {
        startDate: '2026-10-25',
        cursor: page1.nextCursor,
      })
    ).data.error,
  ).toBe('invalid_cursor')
  expect(
    (
      await tool(request, access, 'list_transactions', {
        startDate: '2026-10-25',
      })
    ).data.transactions,
  ).toEqual([])

  const changed = (
    await prepare('batch-stale-duplicate-123', [
      { ...item, description: 'Mudança concorrente' },
    ])
  ).data
  await collection
    .doc('concurrent')
    .set({
      ...item,
      description: 'Mudança concorrente',
      date: Timestamp.fromDate(new Date('2026-10-24T15:00:00Z')),
    })
  expect((await commit(changed)).data.error).toBe('preview_stale')
  const archived = (
    await prepare('batch-archive-reference-123', [
      item,
      { ...item, type: 'income', categoryId: 'salary' },
    ])
  ).data
  await db.doc(`users/${uid}/categories/salary`).update({ archived: true })
  const before = (await collection.get()).size
  expect((await commit(archived, { allowDuplicates: true })).data.error).toBe(
    'invalid_category',
  )
  expect((await collection.get()).size).toBe(before)
  await db.doc(`users/${uid}/categories/salary`).update({ archived: false })
  const card = (
    await prepare('batch-card-reference-1234', [
      { ...item, creditCardId: 'card' },
    ])
  ).data
  await db.doc(`users/${uid}/creditCards/card`).update({ closingDay: 22 })
  expect((await commit(card, { allowDuplicates: true })).data.error).toBe(
    'preview_stale',
  )
  const expired = (await prepare('batch-expired-preview-123')).data
  await db
    .doc(`users/${uid}/mcpOperations/${expired.previewId}`)
    .update({ expiresAt: Timestamp.fromMillis(0) })
  expect((await commit(expired, { allowDuplicates: true })).data.error).toBe(
    'preview_expired',
  )
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const limited = (await prepare('batch-daily-limit-12345', [item, item])).data
  await db
    .doc(`users/${uid}/mcpUsage/writes-${day}`)
    .set({ count: 499, expiresAt: Timestamp.fromMillis(Date.now() + 86400000) })
  expect((await commit(limited, { allowDuplicates: true })).data.error).toBe(
    'rate_limit',
  )
  expect((await collection.get()).size).toBe(before)
  expect(
    (
      await prepare('batch-invalid-reference-123', [
        { ...item, categoryId: 'other-user-category' },
      ])
    ).data.error,
  ).toBe('invalid_category')

  const q = query()
  q.set('scope', 'transactions:read')
  const readCode = new URL(
    (
      await (
        await request.post('/api/mcp/oauth/authorize', {
          data: { query: q.toString() },
          headers: { Origin: origin },
        })
      ).json()
    ).redirect,
  ).searchParams.get('code')!
  const readTokens = await (
    await token(request, {
      grant_type: 'authorization_code',
      code: readCode,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  ).json()
  expect(
    (
      await tool(request, readTokens.access_token, 'prepare_transactions', {
        idempotencyKey: 'read-only-scope-12345',
        transactions: [item],
      })
    ).data.error,
  ).toBe('insufficient_scope')
  expect(
    (await tool(request, readTokens.access_token, 'list_transactions')).data
      .transactions.length,
  ).toBe(before)
  const otherConnection = await (
    await token(request, {
      grant_type: 'authorization_code',
      code: await code(request),
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
  ).json()
  expect(
    (
      await tool(request, otherConnection.access_token, 'commit_transactions', {
        previewId: limited.previewId,
        previewHash: limited.previewHash,
        confirmed: true,
        allowDuplicates: true,
      })
    ).data.error,
  ).toBe('invalid_preview')
  const identity = (
    await db.doc(`users/${uid}/mcpSecrets/${hash(access)}`).get()
  ).data()!
  await db
    .doc(`users/${uid}/mcpConnections/${identity.connectionId}`)
    .update({ revoked: true })
  expect(
    (
      await request.post('/api/mcp', {
        headers: { Authorization: `Bearer ${access}` },
        data: {},
      })
    ).status(),
  ).toBe(401)
})
