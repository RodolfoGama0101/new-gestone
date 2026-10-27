/** @jest-environment jsdom */
import { type User, signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import {
  clearSessionCookie,
  consumeGoogleRedirect,
  markLogoutPending,
  hasPendingLogout,
  signInWithGoogle,
  syncSessionCookie,
  withAuthTimeout,
} from '@/lib/firebase/auth'

jest.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: null, config: { authDomain: 'localhost' } },
}))
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn(() => ({ setCustomParameters: jest.fn() })),
  signInWithPopup: jest.fn(),
  signInWithRedirect: jest.fn(),
}))
const fakeAuth = auth as {
  currentUser: User | null
  config: { authDomain: string }
}
const fetchMock = jest.fn()
const first = {
  uid: 'first',
  getIdToken: jest.fn(async () => 'test-token'),
} as unknown as User
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(async () => {
  jest.clearAllMocks()
  jest.useRealTimers()
  fakeAuth.currentUser = first
  global.fetch = fetchMock
  fetchMock.mockResolvedValue({ ok: true })
  await clearSessionCookie('first')
  fetchMock.mockClear()
  localStorage.clear()
  sessionStorage.clear()
  fakeAuth.config.authDomain = 'localhost'
  delete process.env.NEXT_PUBLIC_USE_EMULATORS
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROXY = 'true'
})
afterEach(() => jest.useRealTimers())

test('mudança de UID durante leitura do token cancela antes de enviar POST', async () => {
  const token = deferred<string>()
  jest.mocked(first.getIdToken).mockReturnValueOnce(token.promise)
  const pending = syncSessionCookie(first)
  await Promise.resolve()
  fakeAuth.currentUser = { uid: 'second' } as User
  token.resolve('must-not-post')
  await expect(pending).rejects.toMatchObject({
    code: 'auth/operation-cancelled',
  })
  expect(fetchMock).not.toHaveBeenCalled()
  expect(localStorage.getItem('gestone-session:first')).toBeNull()
})
test('mudança de UID durante POST não marca sincronização como concluída', async () => {
  const response = deferred<Response>()
  fetchMock.mockReturnValueOnce(response.promise)
  const pending = syncSessionCookie(first)
  for (let count = 0; count < 10 && !fetchMock.mock.calls.length; count++)
    await Promise.resolve()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fakeAuth.currentUser = null
  response.resolve({ ok: true } as Response)
  await expect(pending).rejects.toMatchObject({
    code: 'auth/operation-cancelled',
  })
  expect(localStorage.getItem('gestone-session:first')).toBeNull()
})
test('logout offline mantém intenção; próximo login apaga cookie antes de criar outro', async () => {
  markLogoutPending()
  fetchMock.mockRejectedValueOnce(new Error('offline'))
  await expect(clearSessionCookie('first')).rejects.toMatchObject({
    code: 'auth/session-service-unavailable',
  })
  expect(hasPendingLogout()).toBe(true)
  fetchMock.mockClear()
  await syncSessionCookie(first)
  expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual([
    'DELETE',
    'POST',
  ])
  expect(hasPendingLogout()).toBe(false)
})
test('prazo da leitura de token libera a fila e não publica token atrasado', async () => {
  jest.useFakeTimers()
  const token = deferred<string>()
  jest.mocked(first.getIdToken).mockReturnValueOnce(token.promise)
  const pending = syncSessionCookie(first)
  const rejected = expect(pending).rejects.toMatchObject({
    code: 'auth/session-timeout',
  })
  await jest.advanceTimersByTimeAsync(15001)
  await rejected
  token.resolve('late')
  await clearSessionCookie('first')
  expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(['DELETE'])
})
test('timeout genérico não deixa timer pendente após conclusão', async () => {
  jest.useFakeTimers()
  expect(await withAuthTimeout(Promise.resolve('done'))).toBe('done')
  expect(jest.getTimerCount()).toBe(0)
})
test('popup bloqueado não redireciona silenciosamente', async () => {
  jest
    .mocked(signInWithPopup)
    .mockRejectedValueOnce({ code: 'auth/popup-blocked' })
  await expect(signInWithGoogle()).rejects.toMatchObject({
    code: 'auth/popup-blocked',
  })
  expect(signInWithRedirect).not.toHaveBeenCalled()
})
test('redirect em outra origem é recusado; mesma origem registra retorno e consome uma vez', async () => {
  fakeAuth.config.authDomain = 'other.firebaseapp.com'
  await expect(signInWithGoogle('redirect')).rejects.toMatchObject({
    code: 'auth/redirect-not-configured',
  })
  expect(signInWithRedirect).not.toHaveBeenCalled()
  fakeAuth.config.authDomain = window.location.host
  jest.mocked(signInWithRedirect).mockResolvedValueOnce(undefined as never)
  await signInWithGoogle('redirect')
  expect(consumeGoogleRedirect()).toBe(true)
  expect(consumeGoogleRedirect()).toBe(false)
})
test('falha ao iniciar redirect remove a intenção pendente', async () => {
  fakeAuth.config.authDomain = window.location.host
  jest
    .mocked(signInWithRedirect)
    .mockRejectedValueOnce({ code: 'auth/unauthorized-domain' })
  await expect(signInWithGoogle('redirect')).rejects.toMatchObject({
    code: 'auth/unauthorized-domain',
  })
  expect(consumeGoogleRedirect()).toBe(false)
})

test('espera por Web Lock tem prazo e não executa a operação após expirar', async () => {
  jest.useFakeTimers()
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: jest.fn(() => new Promise(() => {})),
    },
  })
  try {
    const pending = clearSessionCookie('first')
    const rejected = expect(pending).rejects.toMatchObject({
      code: 'auth/session-timeout',
    })
    await jest.advanceTimersByTimeAsync(15001)
    await rejected
    expect(fetchMock).not.toHaveBeenCalled()
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'locks', descriptor)
    else Reflect.deleteProperty(navigator, 'locks')
  }
})
