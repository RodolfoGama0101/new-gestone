import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
}

// Initialize Firebase with SSR check
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY
if (typeof window !== 'undefined' && appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

const auth = getAuth(app)
const db = getFirestore(app)

if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
  if (!firebaseConfig.projectId.startsWith('demo-'))
    throw new Error('Emuladores exigem um projeto demo-.')
  // Uma instância por carregamento do módulo; o SDK mantém as conexões no HMR.
  // Compartilha o hostname localhost do app E2E com o popup e seu iframe.
  if (!auth.emulatorConfig)
    connectAuthEmulator(auth, 'http://localhost:9099', {
      disableWarnings: true,
    })
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8081)
  } catch (error) {
    if ((error as { code?: string }).code !== 'failed-precondition') throw error
  }
}

export { app, auth, db }
