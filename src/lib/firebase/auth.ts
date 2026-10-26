import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth'
import { auth } from './config'
import { createSessionRenewal } from './session-renewal'
import { recordAuthStage } from './auth-diagnostics'

const sessionRenewal = createSessionRenewal({
  storage: () => typeof window === 'undefined' ? undefined : window.localStorage,
  lock: async (operation) => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await navigator.locks.request('gestone-session-cookie', async () => await operation())
    }
    return await operation()
  },
})

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export class SessionSyncError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'SessionSyncError'
  }
}

async function getSessionError(response: Response) {
  const fallbackMessage = 'Não foi possível criar a sessão segura.'

  try {
    const body = (await response.json()) as { code?: unknown; error?: unknown }
    return new SessionSyncError(
      typeof body.code === 'string' ? body.code : 'auth/session-sync-failed',
      response.status,
      typeof body.error === 'string' ? body.error : fallbackMessage,
    )
  } catch {
    return new SessionSyncError('auth/session-sync-failed', response.status, fallbackMessage)
  }
}

export async function syncSessionCookie(user: User, force = true) {
  recordAuthStage('session:waiting-for-lock')
  return sessionRenewal.renew(user.uid, async () => {
  recordAuthStage('session:reading-token')
  if (auth.currentUser?.uid !== user.uid) return
  const token = await user.getIdToken()
  if (auth.currentUser?.uid !== user.uid) return
  recordAuthStage('session:posting-cookie')
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    throw await getSessionError(response)
  }
  recordAuthStage('session:created')
  }, force)
}

export async function clearSessionCookie() {
  recordAuthStage('session:clearing')
  return sessionRenewal.clear(auth.currentUser?.uid, async () => {
  recordAuthStage('session:deleting-cookie')
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw await getSessionError(response)
  }
  recordAuthStage('session:cleared')
  })
}

export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

export async function signUpWithEmail(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

function shouldUseRedirect() {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorWithStandalone.standalone === true
  )
}

export async function signInWithGoogle() {
  if (shouldUseRedirect()) {
    recordAuthStage('google:standalone-redirect')
    await signInWithRedirect(auth, googleProvider)
    return null
  }

  try {
    recordAuthStage('google:opening-popup')
    const userCredential = await signInWithPopup(auth, googleProvider)
    recordAuthStage('google:popup-authenticated')
    return userCredential.user
  } catch (error) {
    recordAuthStage('google:popup-error', error)
    const authError = error as { code?: string }
    if (
      authError.code === 'auth/popup-blocked' ||
      authError.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      recordAuthStage('google:popup-fallback-redirect', error)
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    throw error
  }
}

export async function sendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error) {
    throw error
  }
}
