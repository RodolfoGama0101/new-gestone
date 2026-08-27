jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn(),
    createSessionCookie: jest.fn(),
  },
}))

import { adminAuth } from '@/lib/firebase/admin'
import { DELETE, POST } from '@/app/api/auth/session/route'

const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock
const mockCreateSessionCookie = adminAuth.createSessionCookie as jest.Mock

function sessionRequest(init?: RequestInit) {
  return new Request('http://localhost:3000/api/auth/session', init)
}

describe('session route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('cria um cookie HTTPOnly ao receber um ID token válido da mesma origem', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-1' })
    mockCreateSessionCookie.mockResolvedValue('signed-session-cookie')

    const response = await POST(
      sessionRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          'Sec-Fetch-Site': 'same-origin',
        },
        body: JSON.stringify({ token: 'valid-id-token' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-id-token')
    expect(mockCreateSessionCookie).toHaveBeenCalledWith('valid-id-token', {
      expiresIn: 60 * 60 * 24 * 5 * 1000,
    })
    expect(response.headers.get('set-cookie')).toContain('session=signed-session-cookie')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  test('retorna uma falha clara quando o Firebase Admin não tem credenciais', async () => {
    mockVerifyIdToken.mockRejectedValue({
      code: 'app/invalid-credential',
      message: 'Could not load the default credentials.',
    })

    const response = await POST(
      sessionRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-id-token' }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: 'auth/session-service-unavailable',
      error: 'O serviço de sessão não está configurado corretamente.',
    })
  })

  test('rejeita uma criação de sessão de origem externa', async () => {
    const response = await POST(
      sessionRequest({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://malicious.example',
        },
        body: JSON.stringify({ token: 'valid-id-token' }),
      }),
    )

    expect(response.status).toBe(403)
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  test('limpa o cookie da sessão no logout', async () => {
    const response = await DELETE(
      sessionRequest({
        method: 'DELETE',
        headers: { Origin: 'http://localhost:3000' },
      }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('session=')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
