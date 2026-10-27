jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
    createSessionCookie: jest.fn(),
    verifySessionCookie: jest.fn(),
  },
}))
import { adminAuth } from '@/lib/firebase/admin'
import { DELETE, POST } from '@/app/api/auth/session/route'

const origin = 'http://localhost:3000'
const now = () => Math.floor(Date.now() / 1000)
function request(
  body: unknown = { token: 'valid' },
  headers: Record<string, string> = {},
) {
  return new Request(`${origin}/api/auth/session`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}
beforeEach(() => {
  jest.resetAllMocks()
  jest
    .mocked(adminAuth.verifyIdToken)
    .mockResolvedValue({ uid: 'user', auth_time: now() } as never)
  jest.mocked(adminAuth.createSessionCookie).mockResolvedValue('signed-cookie')
})
afterEach(() => jest.restoreAllMocks())

test('cria cookie seguro com autenticação recente e verifica revogação', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(adminAuth.verifyIdToken).toHaveBeenCalledWith('valid', true)
  expect(adminAuth.createSessionCookie).toHaveBeenCalledWith('valid', {
    expiresIn: 432000000,
  })
  expect(response.headers.get('set-cookie')).toMatch(
    /session=signed-cookie.*HttpOnly.*SameSite=lax/i,
  )
  expect(response.headers.get('cache-control')).toBe('no-store')
})
test.each([null, [], {}, { token: '' }, { token: 42 }])(
  'corpo inválido %j retorna 400',
  async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
  },
)
test('JSON malformado e corpo grande têm respostas distintas', async () => {
  const malformed = new Request(`${origin}/api/auth/session`, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: '{',
  })
  expect((await POST(malformed)).status).toBe(400)
  expect((await POST(request({ token: 'x'.repeat(16000) }))).status).toBe(413)
  expect(
    (await POST(request({}, { 'Content-Type': 'text/plain' }))).status,
  ).toBe(400)
})
test.each<Record<string, string>>([
  { Origin: 'https://external.test' },
  { Origin: '' },
  { 'Sec-Fetch-Site': 'same-site' },
  { 'Sec-Fetch-Site': 'cross-site' },
])('origem ou metadados recusados: %j', async (headers) => {
  expect((await POST(request(undefined, headers))).status).toBe(403)
  expect(adminAuth.verifyIdToken).not.toHaveBeenCalled()
})
test.each([
  'auth/id-token-revoked',
  'auth/id-token-expired',
  'auth/invalid-id-token',
  'auth/user-disabled',
])('credencial inválida %s não cria cookie', async (code) => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest
    .mocked(adminAuth.verifyIdToken)
    .mockRejectedValue({ code, email: 'private' })
  expect((await POST(request())).status).toBe(401)
  expect(adminAuth.createSessionCookie).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledWith(
    'Erro ao criar cookie de sessão:',
    code,
  )
})
test.each([
  'app/invalid-credential',
  'auth/insufficient-permission',
  'auth/internal-error',
  'ECONNRESET',
])('configuração ou transporte %s retorna 503', async (code) => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.mocked(adminAuth.verifyIdToken).mockRejectedValue({ code })
  const response = await POST(request())
  expect(response.status).toBe(503)
  expect((await response.json()).code).toBe('auth/session-service-unavailable')
})
test('token de login antigo não cria nova sessão', async () => {
  jest
    .mocked(adminAuth.verifyIdToken)
    .mockResolvedValue({ uid: 'user', auth_time: now() - 301 } as never)
  expect((await POST(request())).status).toBe(401)
  expect(adminAuth.createSessionCookie).not.toHaveBeenCalled()
})
test('cookie válido do mesmo UID permite renovação sem novo login', async () => {
  jest
    .mocked(adminAuth.verifyIdToken)
    .mockResolvedValue({ uid: 'user', auth_time: now() - 86400 } as never)
  jest
    .mocked(adminAuth.verifySessionCookie)
    .mockResolvedValue({ uid: 'user' } as never)
  expect(
    (await POST(request(undefined, { Cookie: 'session=existing' }))).status,
  ).toBe(200)
  expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith('existing', true)
  jest
    .mocked(adminAuth.verifySessionCookie)
    .mockResolvedValue({ uid: 'other' } as never)
  expect(
    (await POST(request(undefined, { Cookie: 'session=existing' }))).status,
  ).toBe(403)
  jest
    .mocked(adminAuth.verifySessionCookie)
    .mockRejectedValue({ code: 'auth/session-cookie-revoked' })
  expect(
    (await POST(request(undefined, { Cookie: 'session=existing' }))).status,
  ).toBe(401)
})
test.each([undefined, 'invalid', -1, Number.MAX_SAFE_INTEGER])(
  'auth_time inválido %j não renova nem com cookie',
  async (auth_time) => {
    jest
      .mocked(adminAuth.verifyIdToken)
      .mockResolvedValue({ uid: 'user', auth_time } as never)
    expect(
      (await POST(request(undefined, { Cookie: 'session=existing' }))).status,
    ).toBe(401)
  },
)
test('logout remove cookie apenas da origem exata', async () => {
  const response = await DELETE(
    new Request(`${origin}/api/auth/session`, {
      method: 'DELETE',
      headers: { Origin: origin },
    }),
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  expect(
    (
      await DELETE(
        new Request(`${origin}/api/auth/session`, { method: 'DELETE' }),
      )
    ).status,
  ).toBe(403)
})
