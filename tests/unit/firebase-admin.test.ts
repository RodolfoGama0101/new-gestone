jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(() => ({})),
  cert: jest.fn(),
}))
jest.mock('firebase-admin/auth', () => ({ getAuth: jest.fn() }))
jest.mock('firebase-admin/firestore', () => ({ getFirestore: jest.fn() }))
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

const previous = { ...process.env }
beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.NEXT_PUBLIC_USE_EMULATORS
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-test'
  process.env.FIREBASE_PROJECT_ID = 'demo-test'
  delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY
})
afterEach(() => {
  process.env = { ...previous }
})
test('configuração malformada não impede importar a rota; falha na primeira operação', () => {
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{'
  expect(initializeApp).not.toHaveBeenCalled()
  expect(() => adminAuth.verifyIdToken('fake')).toThrow()
  expect(getAuth).not.toHaveBeenCalled()
})
test('conta de serviço de outro projeto é recusada antes de inicializar', () => {
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
    project_id: 'other',
    client_email: 'test@example.test',
    private_key: 'fake',
  })
  expect(() => adminAuth.verifyIdToken('fake')).toThrow()
  expect(cert).not.toHaveBeenCalled()
})
test('projetos cliente e servidor precisam coincidir', () => {
  process.env.FIREBASE_PROJECT_ID = 'other'
  expect(() => adminDb.doc('users/test')).toThrow()
  expect(initializeApp).not.toHaveBeenCalled()
})
test('métodos do Admin preservam this ao serem acessados pelo proxy', () => {
  const service = {
    project: 'demo-test',
    verifyIdToken() {
      return this.project
    },
  }
  jest.mocked(getAuth).mockReturnValue(service as never)
  const verify = adminAuth.verifyIdToken
  expect(verify('fake')).toBe('demo-test')
  const store = {
    project: 'demo-test',
    doc() {
      return this.project
    },
  }
  jest.mocked(getFirestore).mockReturnValue(store as never)
  expect(adminDb.doc('users/test')).toBe('demo-test')
})
