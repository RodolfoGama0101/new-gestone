/** @jest-environment jsdom */
import { recordAuthStage } from '@/lib/firebase/auth-diagnostics'

beforeEach(() => {
  sessionStorage.clear()
  delete document.documentElement.dataset.authStage
  delete document.documentElement.dataset.authFlow
  delete document.documentElement.dataset.authError
})

afterEach(() => jest.restoreAllMocks())

test('preserva o fluxo após navegar sem guardar dados da exceção ou da conta', () => {
  recordAuthStage('google:opening-popup')
  recordAuthStage('google:popup-fallback-redirect', {
    code: 'auth/popup-blocked',
    message: 'token=segredo-de-teste',
    email: 'privado@example.test',
    uid: 'uid-privado',
  })
  delete document.documentElement.dataset.authFlow
  delete document.documentElement.dataset.authError

  recordAuthStage('authentication:initializing')

  expect(document.documentElement.dataset.authFlow).toBe(
    'google:popup-fallback-redirect',
  )
  expect(document.documentElement.dataset.authError).toBe('auth/popup-blocked')
  const stored = Object.values(sessionStorage).join(' ')
  expect(stored).not.toMatch(/segredo-de-teste|privado@example|uid-privado/)
})

test('armazenamento bloqueado não impede a autenticação de continuar', () => {
  for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
    jest.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException('Armazenamento bloqueado', 'SecurityError')
    })
  }
  expect(() => {
    recordAuthStage('authentication:initializing')
    recordAuthStage('google:opening-popup')
    recordAuthStage('session:created')
  }).not.toThrow()
  expect(document.documentElement.dataset.authStage).toBe('session:created')
})

test('não copia um código arbitrário que possa conter dados privados', () => {
  recordAuthStage('google:popup-error', { code: 'token=segredo-de-teste' })
  expect(document.documentElement.dataset.authError).toBeUndefined()
  expect(sessionStorage.getItem('gestone:auth-debug-error')).toBeNull()
})
