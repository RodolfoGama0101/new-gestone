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

export async function syncSessionCookie(user: User) {
  const token = await user.getIdToken()
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
}

export async function clearSessionCookie() {
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw await getSessionError(response)
  }
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
    await signInWithRedirect(auth, googleProvider)
    return null
  }

  try {
    const userCredential = await signInWithPopup(auth, googleProvider)
    return userCredential.user
  } catch (error) {
    const authError = error as { code?: string }
    if (
      authError.code === 'auth/popup-blocked' ||
      authError.code === 'auth/operation-not-supported-in-this-environment'
    ) {
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
