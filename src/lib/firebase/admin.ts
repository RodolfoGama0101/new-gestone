import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { AuthFlowError } from './auth-errors'

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp()
  }

  if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? ''
    if (
      !projectId.startsWith('demo-') ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
      process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8081'
    )
      throw new Error('Configuração de emuladores inválida.')
    return initializeApp({ projectId })
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (
    projectId &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    throw new AuthFlowError('app/invalid-credential')
  }
  const serviceAccountKey: unknown = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? (JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as unknown)
    : null

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    if (
      !serviceAccountKey ||
      typeof serviceAccountKey !== 'object' ||
      !('project_id' in serviceAccountKey) ||
      typeof serviceAccountKey.project_id !== 'string' ||
      !('client_email' in serviceAccountKey) ||
      typeof serviceAccountKey.client_email !== 'string' ||
      !('private_key' in serviceAccountKey) ||
      typeof serviceAccountKey.private_key !== 'string' ||
      (projectId && serviceAccountKey.project_id !== projectId)
    ) {
      throw new AuthFlowError('app/invalid-credential')
    }
    return initializeApp({
      credential: cert({
        projectId: serviceAccountKey.project_id,
        clientEmail: serviceAccountKey.client_email,
        privateKey: serviceAccountKey.private_key,
      }),
    })
  }

  return initializeApp({
    projectId,
  })
}

// Inicializa dentro da operação: configuração inválida chega ao tratamento da rota.
function lazyService<T extends object>(create: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const service = create()
      const value: unknown = Reflect.get(service, property)
      return typeof value === 'function' ? value.bind(service) : value
    },
  })
}
const adminAuth = lazyService<Auth>(() => getAuth(initializeFirebaseAdmin()))
const adminDb = lazyService<Firestore>(() =>
  getFirestore(initializeFirebaseAdmin()),
)

export { adminAuth, adminDb }
