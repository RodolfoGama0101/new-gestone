/** @jest-environment jsdom */
import { signInWithPopup, signInWithRedirect, type UserCredential } from 'firebase/auth'
import { signInWithGoogle } from '@/lib/firebase/auth'

jest.mock('@/lib/firebase/config', () => ({ auth: {} }))
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

test('popup bloqueado retorna o erro sem perder o fluxo em redirecionamento', async () => {
  const error = { code: 'auth/popup-blocked' }
  jest.mocked(signInWithPopup).mockRejectedValueOnce(error)
  await expect(signInWithGoogle()).rejects.toBe(error)
  expect(signInWithRedirect).not.toHaveBeenCalled()
})

test('popup autorizado continua retornando o usuário autenticado', async () => {
  const user = { uid: 'demo-google-user' }
  jest.mocked(signInWithPopup).mockResolvedValueOnce({ user } as UserCredential)
  await expect(signInWithGoogle()).resolves.toBe(user)
  expect(signInWithRedirect).not.toHaveBeenCalled()
})
