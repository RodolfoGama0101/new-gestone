import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApp()
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
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

const app = initializeFirebaseAdmin()
const adminAuth = getAuth(app)
const adminDb = getFirestore(app)

export { adminAuth, adminDb }
