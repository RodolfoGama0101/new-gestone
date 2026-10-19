import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

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

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null

  if (serviceAccountKey) {
    return initializeApp({
      credential: cert(serviceAccountKey),
    })
  }

  return initializeApp({
    projectId:
      process.env.FIREBASE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

const app = initializeFirebaseAdmin()
const adminAuth = getAuth(app)
const adminDb = getFirestore(app)

export { adminAuth, adminDb }
