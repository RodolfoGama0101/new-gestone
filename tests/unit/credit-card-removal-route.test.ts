jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: { verifySessionCookie: jest.fn() },
}))
jest.mock('@/services/credit-card-removal.service', () => ({
  ...jest.requireActual('@/services/credit-card-removal.service'),
  removeCreditCard: jest.fn(),
}))
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import {
  CreditCardRemovalError,
  removeCreditCard,
} from '@/services/credit-card-removal.service'
import { DELETE } from '@/app/api/credit-cards/[cardId]/route'

const context = (cardId = 'card') => ({ params: Promise.resolve({ cardId }) })
const request = (headers: Record<string, string> = {}) =>
  new Request('https://gestone.test/api/credit-cards/card', {
    method: 'DELETE',
    headers: { origin: 'https://gestone.test', ...headers },
    body: JSON.stringify({ uid: 'other' }),
  })
beforeEach(() => {
  jest.resetAllMocks()
  jest
    .mocked(cookies)
    .mockResolvedValue({ get: () => ({ value: 'session' }) } as never)
  jest
    .mocked(adminAuth.verifySessionCookie)
    .mockResolvedValue({ uid: 'owner' } as never)
})

test('exclui usando somente UID da sessão verificada e impede cache', async () => {
  const response = await DELETE(request(), context())
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ action: 'deleted' })
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(adminAuth.verifySessionCookie).toHaveBeenCalledWith('session', true)
  expect(removeCreditCard).toHaveBeenCalledWith('owner', 'card')
})
test.each<Record<string, string>>([
  { origin: 'https://external.test' },
  { 'sec-fetch-site': 'cross-site' },
])('rejeita origem externa: %j', async (headers) => {
  expect((await DELETE(request(headers), context())).status).toBe(403)
  expect(removeCreditCard).not.toHaveBeenCalled()
})
test.each(['missing', 'revoked'])('rejeita sessão %s', async (state) => {
  if (state === 'missing')
    jest.mocked(cookies).mockResolvedValue({ get: () => undefined } as never)
  else
    jest
      .mocked(adminAuth.verifySessionCookie)
      .mockRejectedValue(new Error('revoked'))
  expect((await DELETE(request(), context())).status).toBe(401)
  expect(removeCreditCard).not.toHaveBeenCalled()
})
test.each(['', '..', '.', 'other/card', 'é'.repeat(751)])(
  'rejeita ID inválido',
  async (id) => {
    expect((await DELETE(request(), context(id))).status).toBe(400)
    expect(removeCreditCard).not.toHaveBeenCalled()
  },
)
test.each([
  ['card/not-found', 404],
  ['card/has-links', 409],
] as const)('retorna %s como %s', async (code, status) => {
  jest
    .mocked(removeCreditCard)
    .mockRejectedValue(new CreditCardRemovalError(code))
  expect((await DELETE(request(), context())).status).toBe(status)
})
test('não expõe detalhes internos na falha', async () => {
  jest
    .mocked(removeCreditCard)
    .mockRejectedValue(new Error('private database details'))
  const response = await DELETE(request(), context())
  expect(response.status).toBe(500)
  expect(JSON.stringify(await response.json())).not.toContain('private')
})
