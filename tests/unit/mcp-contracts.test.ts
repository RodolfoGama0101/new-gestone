import { createHash } from 'node:crypto'
import {
  authorizationRequest,
  equalSecret,
  hashSecret,
  mcpConfig,
  newSecret,
} from '@/lib/mcp/config'
import {
  civilDate,
  civilTimestamp,
  createMcpTransactionSchema,
} from '@/lib/mcp/transaction'

const previousEnv = { ...process.env }
beforeEach(() => {
  process.env.MCP_ORIGIN = 'https://gestone.example.test'
  process.env.MCP_ALLOWED_UIDS = 'owner'
  process.env.MCP_CLIENT_ID = 'client'
  process.env.MCP_REDIRECT_URIS = 'https://chatgpt.com/connector/oauth/example'
})
afterAll(() => {
  process.env = previousEnv
})

function authorization() {
  return new URLSearchParams({
    response_type: 'code',
    client_id: 'client',
    redirect_uri: process.env.MCP_REDIRECT_URIS!,
    resource: `${process.env.MCP_ORIGIN}/api/mcp`,
    state: 'random-state',
    code_challenge_method: 'S256',
    code_challenge: createHash('sha256')
      .update('v'.repeat(43))
      .digest('base64url'),
  })
}

test('configuração incompleta falha fechada; callbacks não usam curingas', () => {
  expect(mcpConfig().uids).toEqual(['owner'])
  delete process.env.MCP_ALLOWED_UIDS
  expect(() => mcpConfig()).toThrow('não está configurada')
})

test.each([
  ['redirect_uri', 'https://attacker.example.test/callback'],
  ['resource', 'https://attacker.example.test/api/mcp'],
  ['client_id', 'other'],
  ['code_challenge_method', 'plain'],
  ['scope', 'admin'],
  ['state', ''],
])('recusa %s inválido', (key, value) => {
  const params = authorization()
  params.set(key, value)
  expect(() => authorizationRequest(params)).toThrow('inválida')
})

test('aceita PKCE S256 e rejeita parâmetros duplicados', () => {
  const params = authorization()
  expect(authorizationRequest(params).scopes).toEqual([
    'transactions:read',
    'transactions:write',
  ])
  params.append('client_id', 'other')
  expect(() => authorizationRequest(params)).toThrow('repetido')
})

test('segredos aleatórios opacos, hash estável e comparação de tamanho constante', () => {
  const first = newSecret(),
    second = newSecret()
  expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(first).not.toBe(second)
  expect(equalSecret(first, first)).toBe(true)
  expect(equalSecret(first, second)).toBe(false)
  expect(hashSecret(first)).toHaveLength(64)
})

test.each([
  ['2026-10-23T02:59:59Z', '2026-10-22'],
  ['2027-01-01T02:59:59Z', '2026-12-31'],
  ['2027-01-01T03:00:00Z', '2027-01-01'],
])('hoje usa São Paulo em %s', (iso, expected) => {
  expect(civilDate(new Date(iso))).toBe(expected)
})

test.each(['2026-02-30', '2026-13-01', '23/10/2026', '2026-10-23T12:00Z'])(
  'rejeita data civil inválida %s',
  (value) => {
    expect(() => civilTimestamp(value)).toThrow('Data inválida')
  },
)

test.each(['2024-02-29', '2026-12-31', '2018-12-01'])(
  'data %s preserva o dia e considera o fuso histórico',
  (date) => {
    expect(civilDate(civilTimestamp(date))).toBe(date)
    if (date === '2018-12-01')
      expect(civilTimestamp(date).toISOString()).toBe(
        '2018-12-01T14:00:00.000Z',
      )
  },
)

test('contrato exige centavos inteiros, rejeita campos extras e não cria séries', () => {
  const transaction = {
    type: 'expense',
    amount: 4000,
    categoryId: 'food',
    description: 'Mercado',
  }
  const valid = { transaction, idempotencyKey: 'operation-123456789' }
  expect(createMcpTransactionSchema.parse(valid).transaction.amount).toBe(4000)
  for (const change of [
    { amount: 40.5 },
    { amount: '4000' },
    { amount: Number.MAX_SAFE_INTEGER + 1 },
    { categoryId: '../other' },
    { recurring: true },
    { uid: 'other' },
    { creditCardId: '../other' },
  ]) {
    expect(
      createMcpTransactionSchema.safeParse({
        ...valid,
        transaction: { ...transaction, ...change },
      }).success,
    ).toBe(false)
  }
})
