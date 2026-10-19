jest.mock('next/headers', () => ({ cookies: jest.fn() }))
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
    verifyIdToken: jest.fn(),
    deleteUser: jest.fn(),
  },
  adminDb: { doc: jest.fn(), recursiveDelete: jest.fn() },
}))

import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { DELETE } from '@/app/api/account/route'

const now = 1_800_000_000
const mockCookies = cookies as jest.Mock
const mockVerifySession = adminAuth.verifySessionCookie as jest.Mock
const mockVerifyToken = adminAuth.verifyIdToken as jest.Mock
const mockDeleteUser = adminAuth.deleteUser as jest.Mock
const mockDeleteData = adminDb.recursiveDelete as jest.Mock
const mockDoc = adminDb.doc as jest.Mock

function request(headers: Record<string, string> = {}) {
  return new Request('https://gestone.example/api/account', {
    method: 'DELETE',
    headers: {
      Origin: 'https://gestone.example',
      'Sec-Fetch-Site': 'same-origin',
      Authorization: 'Bearer recent-token',
      ...headers,
    },
  })
}

describe('exclusão de conta com autenticação recente', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(now * 1000)
    mockCookies.mockResolvedValue({ get: () => ({ value: 'old-session' }) })
    mockVerifySession.mockResolvedValue({ uid: 'user-1', auth_time: now - 4 * 86400 })
    mockVerifyToken.mockResolvedValue({ uid: 'user-1', auth_time: now - 60 })
    mockDoc.mockReturnValue('user-document')
  })

  afterEach(() => jest.restoreAllMocks())

  function expectNoDeletion() {
    expect(mockDeleteData).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  }

  test('sessão antiga e token recente do mesmo usuário autorizam a exclusão e limpam o cookie', async () => {
    const response = await DELETE(request())

    expect(response.status).toBe(200)
    expect(mockVerifySession).toHaveBeenCalledWith('old-session', true)
    expect(mockVerifyToken).toHaveBeenCalledWith('recent-token', true)
    expect(adminDb.doc).toHaveBeenCalledWith('users/user-1')
    expect(mockDeleteData).toHaveBeenCalledWith('user-document')
    expect(mockDeleteUser).toHaveBeenCalledWith('user-1')
    expect(mockDeleteData.mock.invocationCallOrder[0]).toBeLessThan(mockDeleteUser.mock.invocationCallOrder[0])
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  test.each(['', 'Basic recent-token', 'Bearer token extra'])('cookie sozinho ou autorização malformada não bastam: %s', async (authorization) => {
    const response = await DELETE(request({ Authorization: authorization }))
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe('auth/requires-recent-login')
    expectNoDeletion()
  })

  test('token recente sem cookie não autoriza exclusão', async () => {
    mockCookies.mockResolvedValue({ get: () => undefined })
    const response = await DELETE(request())
    expect(response.status).toBe(401)
    expect(mockVerifyToken).not.toHaveBeenCalled()
    expectNoDeletion()
  })

  test('token de outro usuário não autoriza exclusão', async () => {
    mockVerifyToken.mockResolvedValue({ uid: 'user-2', auth_time: now })
    const response = await DELETE(request())
    expect(response.status).toBe(403)
    expectNoDeletion()
  })

  test.each([now - 301, now + 1, undefined, NaN, '1800000000'])('rejeita auth_time antigo, futuro ou inválido: %s', async (authTime) => {
    // iat recente representa renovação de token, não uma nova autenticação.
    mockVerifyToken.mockResolvedValue({ uid: 'user-1', auth_time: authTime, iat: now })
    const response = await DELETE(request())
    expect(response.status).toBe(401)
    expect((await response.json()).code).toBe('auth/requires-recent-login')
    expectNoDeletion()
  })

  test('aceita autenticação no limite de cinco minutos', async () => {
    mockVerifyToken.mockResolvedValue({ uid: 'user-1', auth_time: now - 300 })
    expect((await DELETE(request())).status).toBe(200)
  })

  test.each(['auth/id-token-expired', 'auth/id-token-revoked', 'auth/argument-error', 'auth/user-disabled'])('rejeita token inválido: %s', async (code) => {
    mockVerifyToken.mockRejectedValue({ code })
    expect((await DELETE(request())).status).toBe(401)
    expectNoDeletion()
  })

  test.each(['auth/session-cookie-expired', 'auth/session-cookie-revoked'])('rejeita sessão inválida: %s', async (code) => {
    mockVerifySession.mockRejectedValue({ code })
    expect((await DELETE(request())).status).toBe(401)
    expect(mockVerifyToken).not.toHaveBeenCalled()
    expectNoDeletion()
  })

  test.each<Record<string, string>>([
    { Origin: 'https://external.example' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ])('rejeita origem externa antes de validar as credenciais: %j', async (headers) => {
    const response = await DELETE(request(headers))
    expect(response.status).toBe(403)
    expect(mockVerifySession).not.toHaveBeenCalled()
    expect(mockVerifyToken).not.toHaveBeenCalled()
    expectNoDeletion()
  })

  test('falha na exclusão dos dados não remove usuário nem cookie e não registra dados sensíveis', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockDeleteData.mockRejectedValue({ code: 'firestore/unavailable', message: 'sensitive-details' })
    const response = await DELETE(request())
    expect(response.status).toBe(500)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('Erro ao excluir conta:', 'firestore/unavailable')
  })
})
