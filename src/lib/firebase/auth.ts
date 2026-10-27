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
import { AuthFlowError } from './auth-errors'

const TIMEOUT_MS = 15000
const LOGOUT_KEY = 'gestone:logout-pending'
const REDIRECT_KEY = 'gestone:google-redirect'
let pendingLogout = false
let sessionQueue = Promise.resolve()

export async function withAuthTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AuthFlowError('auth/session-timeout')),
          TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function sessionLock<T>(operation: () => Promise<T>): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const waitingTimeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new AuthFlowError('auth/session-timeout'))
    }, TIMEOUT_MS)
  })
  const run = async () => {
    if (controller.signal.aborted)
      throw new AuthFlowError('auth/session-timeout')
    clearTimeout(timer)
    return operation()
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return await Promise.race([
        navigator.locks.request(
          'gestone-session-cookie',
          { signal: controller.signal },
          run,
        ),
        waitingTimeout,
      ])
    }
    const queued = sessionQueue.then(run, run)
    sessionQueue = queued.then(
      () => undefined,
      () => undefined,
    )
    return await Promise.race([queued, waitingTimeout])
  } catch (error) {
    if (controller.signal.aborted)
      throw new AuthFlowError('auth/session-timeout')
    throw error
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

const sessionRenewal = createSessionRenewal({
  storage: () =>
    typeof window === 'undefined' ? undefined : window.localStorage,
  lock: sessionLock,
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

async function sessionRequest(method: 'POST' | 'DELETE', token?: string) {
  try {
    const response = await fetch('/api/auth/session', {
      method,
      credentials: 'same-origin',
      headers:
        method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: token ? JSON.stringify({ token }) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)
      const code =
        body &&
        typeof body === 'object' &&
        'code' in body &&
        typeof body.code === 'string'
          ? body.code
          : 'auth/session-service-unavailable'
      throw new SessionSyncError(
        code,
        response.status,
        'Não foi possível sincronizar a sessão segura.',
      )
    }
  } catch (error) {
    if (error instanceof SessionSyncError) throw error
    throw new AuthFlowError('auth/session-service-unavailable')
  }
}

export function markLogoutPending() {
  pendingLogout = true
  try {
    localStorage.setItem(LOGOUT_KEY, '1')
  } catch {
    /* usa memória */
  }
}

export function hasPendingLogout() {
  try {
    return pendingLogout || localStorage.getItem(LOGOUT_KEY) === '1'
  } catch {
    return pendingLogout
  }
}

export async function clearSessionCookie(
  uid?: string,
  isCurrent: () => boolean = () => true,
) {
  recordAuthStage('session:clearing')
  return sessionRenewal.clear(uid, async () => {
    if (!isCurrent()) throw new AuthFlowError('auth/operation-cancelled')
    await sessionRequest('DELETE')
    pendingLogout = false
    try {
      localStorage.removeItem(LOGOUT_KEY)
    } catch {
      /* usa memória */
    }
    recordAuthStage('session:cleared')
  })
}

export async function syncSessionCookie(
  user: User,
  force = true,
  isCurrent: () => boolean = () => true,
) {
  const assertCurrent = () => {
    if (!isCurrent() || auth.currentUser?.uid !== user.uid) {
      throw new AuthFlowError('auth/operation-cancelled')
    }
  }
  assertCurrent()
  recordAuthStage('session:waiting-for-lock')
  await sessionRenewal.renew(
    user.uid,
    async () => {
      assertCurrent()
      if (hasPendingLogout()) {
        await sessionRequest('DELETE')
        pendingLogout = false
        try {
          localStorage.removeItem(LOGOUT_KEY)
        } catch {
          /* usa memória */
        }
      }
      recordAuthStage('session:reading-token')
      const token = await withAuthTimeout(user.getIdToken())
      assertCurrent()
      recordAuthStage('session:posting-cookie')
      await sessionRequest('POST', token)
      assertCurrent()
      recordAuthStage('session:created')
    },
    force,
  )
  assertCurrent()
}

export async function signInWithEmail(email: string, password: string) {
  return (await signInWithEmailAndPassword(auth, email, password)).user
}

export async function signUpWithEmail(email: string, password: string) {
  return (await createUserWithEmailAndPassword(auth, email, password)).user
}

export function canUseGoogleRedirect() {
  return (
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' ||
    (process.env.NEXT_PUBLIC_FIREBASE_AUTH_PROXY === 'true' &&
      typeof window !== 'undefined' &&
      auth.config.authDomain === window.location.host)
  )
}

export function consumeGoogleRedirect() {
  try {
    const started = Number(sessionStorage.getItem(REDIRECT_KEY))
    sessionStorage.removeItem(REDIRECT_KEY)
    return (
      started > 0 &&
      Date.now() - started >= 0 &&
      Date.now() - started < 10 * 60 * 1000
    )
  } catch {
    return false
  }
}

export async function signInWithGoogle(mode: 'popup' | 'redirect' = 'popup') {
  const standalone =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  if (mode === 'redirect' || (standalone && canUseGoogleRedirect())) {
    if (!canUseGoogleRedirect())
      throw new AuthFlowError('auth/redirect-not-configured')
    try {
      sessionStorage.setItem(REDIRECT_KEY, String(Date.now()))
    } catch {
      throw new AuthFlowError('auth/web-storage-unsupported')
    }
    recordAuthStage('google:standalone-redirect')
    try {
      await signInWithRedirect(auth, googleProvider)
      return null
    } catch (error) {
      consumeGoogleRedirect()
      throw error
    }
  }
  try {
    recordAuthStage('google:opening-popup')
    const result = await signInWithPopup(auth, googleProvider)
    recordAuthStage('google:popup-authenticated')
    return result.user
  } catch (error) {
    recordAuthStage('google:popup-error', error)
    throw error
  }
}

export async function sendPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email)
}
