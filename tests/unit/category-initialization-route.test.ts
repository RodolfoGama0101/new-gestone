jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@/lib/firebase/admin', () => ({ adminAuth: { verifySessionCookie: jest.fn() } }))
jest.mock('@/services/category-initialization.service', () => ({ initializeCategories: jest.fn() }))
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { initializeCategories } from '@/services/category-initialization.service'
import { POST } from '@/app/api/categories/initialize/route'

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(cookies).mockResolvedValue({ get: () => ({ value: 'session' }) } as never)
  jest.mocked(adminAuth.verifySessionCookie).mockResolvedValue({ uid: 'owner' } as never)
})
const request = (origin = 'https://gestone.test') => new Request('https://gestone.test/api/categories/initialize', { method: 'POST', headers: { origin }, body: JSON.stringify({ uid: 'other-user' }) })

test('UID vem somente da sessão verificada e resposta não pode ser cacheada', async () => {
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(initializeCategories).toHaveBeenCalledWith('owner')
  expect(response.headers.get('cache-control')).toBe('no-store')
})
test('origem externa é rejeitada antes de acessar dados', async () => {
  expect((await POST(request('https://evil.test'))).status).toBe(403)
  expect(initializeCategories).not.toHaveBeenCalled()
})
test('sessão inválida é rejeitada', async () => {
  jest.mocked(adminAuth.verifySessionCookie).mockRejectedValue(new Error('revoked'))
  expect((await POST(request())).status).toBe(401)
  expect(initializeCategories).not.toHaveBeenCalled()
})
