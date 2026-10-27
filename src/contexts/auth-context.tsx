'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  type User,
  getRedirectResult,
  onIdTokenChanged,
  signOut,
} from 'firebase/auth'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase/config'
import { recordAuthStage } from '@/lib/firebase/auth-diagnostics'
import { AuthFlowError, authErrorMessage } from '@/lib/firebase/auth-errors'
import {
  clearSessionCookie,
  consumeGoogleRedirect,
  hasPendingLogout,
  markLogoutPending,
  signInWithEmail as signInWithEmailCredential,
  signInWithGoogle as signInWithGoogleCredential,
  signUpWithEmail as signUpWithEmailCredential,
  syncSessionCookie,
  withAuthTimeout,
} from '@/lib/firebase/auth'

type AuthStatus =
  'initializing' | 'authenticating' | 'synchronizing' | 'ready' | 'error'
interface AuthContextType {
  user: User | null
  isLoading: boolean
  sessionError: string | null
  retrySession: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<User>
  signUpWithEmail: (email: string, password: string) => Promise<User>
  signInWithGoogle: (mode?: 'popup' | 'redirect') => Promise<User | null>
  signOutUser: () => Promise<void>
}

const unavailable = async (): Promise<never> => {
  throw new Error('AuthProvider não está disponível.')
}
const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  sessionError: null,
  retrySession: unavailable,
  signInWithEmail: unavailable,
  signUpWithEmail: unavailable,
  signInWithGoogle: unavailable,
  signOutUser: unavailable,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [status, setStatus] = React.useState<AuthStatus>('initializing')
  const [sessionError, setSessionError] = React.useState<string | null>(null)
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const mounted = React.useRef(false)
  const initialized = React.useRef(false)
  const generation = React.useRef(0)
  const action = React.useRef<number | null>(null)
  const synchronizedUid = React.useRef<string | null>(null)
  const navigating = React.useRef(false)
  const redirectResult = React.useRef<Promise<void> | null>(null)
  const invalidate = React.useCallback(() => {
    generation.current += 1
  }, [])

  const clearCache = React.useCallback(async () => {
    await queryClient.cancelQueries()
    queryClient.clear()
  }, [queryClient])

  const isCurrent = React.useCallback(
    (id: number, firebaseUser: User | null) =>
      mounted.current &&
      generation.current === id &&
      (auth.currentUser?.uid ?? null) === (firebaseUser?.uid ?? null),
    [],
  )

  const synchronize = React.useCallback(
    async (firebaseUser: User | null, id: number, force = true) => {
      const current = () => isCurrent(id, firebaseUser)
      if (!current()) throw new AuthFlowError('auth/operation-cancelled')
      // Bloqueia o painel antes de aguardar a limpeza da conta anterior.
      // Renovação do mesmo UID preserva os diálogos de reautenticação.
      if (force || synchronizedUid.current !== (firebaseUser?.uid ?? null)) {
        setStatus('synchronizing')
      }
      if (synchronizedUid.current !== (firebaseUser?.uid ?? null)) {
        setUser(null)
        await clearCache()
      }
      if (!current()) throw new AuthFlowError('auth/operation-cancelled')
      if (firebaseUser) await syncSessionCookie(firebaseUser, force, current)
      else
        await clearSessionCookie(synchronizedUid.current ?? undefined, current)
      if (!current()) throw new AuthFlowError('auth/operation-cancelled')
      synchronizedUid.current = firebaseUser?.uid ?? null
      setSessionError(null)
      setUser(firebaseUser)
      setStatus('ready')
    },
    [clearCache, isCurrent],
  )

  const failSession = React.useCallback((error: unknown, id: number) => {
    if (!mounted.current || generation.current !== id) return
    recordAuthStage('authentication:failed', error)
    ++generation.current
    synchronizedUid.current = null
    setUser(null)
    setSessionError(authErrorMessage(error))
    setStatus('error')
  }, [])

  const completeAuthentication = React.useCallback(
    async (authenticate: () => Promise<User | null>) => {
      if (action.current !== null || !initialized.current)
        throw new AuthFlowError('auth/action-in-progress')
      const id = ++generation.current
      action.current = id
      setStatus('authenticating')
      setSessionError(null)
      let credential: User | null = null
      try {
        // Chamada imediata mantém o vínculo entre clique e popup do SDK.
        credential = await authenticate()
        if (!credential) {
          if (generation.current === id && mounted.current) setStatus('ready')
          return null
        }
        await synchronize(credential, id)
        return credential
      } catch (error) {
        if (credential) failSession(error, id)
        else if (generation.current === id && mounted.current)
          setStatus('ready')
        throw error
      } finally {
        if (action.current === id) action.current = null
      }
    },
    [synchronize, failSession],
  )

  const signInWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const result = await completeAuthentication(() =>
        signInWithEmailCredential(email, password),
      )
      if (!result) throw new AuthFlowError('auth/null-user')
      return result
    },
    [completeAuthentication],
  )
  const signUpWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const result = await completeAuthentication(() =>
        signUpWithEmailCredential(email, password),
      )
      if (!result) throw new AuthFlowError('auth/null-user')
      return result
    },
    [completeAuthentication],
  )
  const signInWithGoogle = React.useCallback(
    (mode?: 'popup' | 'redirect') =>
      completeAuthentication(() => signInWithGoogleCredential(mode)),
    [completeAuthentication],
  )

  const retrySession = React.useCallback(async () => {
    if (action.current !== null || !initialized.current) return
    const id = ++generation.current
    action.current = id
    setStatus('synchronizing')
    try {
      await synchronize(auth.currentUser, id)
    } catch (error) {
      failSession(error, id)
    } finally {
      if (action.current === id) action.current = null
    }
  }, [synchronize, failSession])

  const signOutUser = React.useCallback(async () => {
    if (action.current !== null)
      throw new AuthFlowError('auth/action-in-progress')
    const uid = auth.currentUser?.uid
    const id = ++generation.current
    action.current = id
    markLogoutPending()
    setUser(null)
    setSessionError(null)
    setStatus('synchronizing')
    try {
      await clearCache()
      await signOut(auth)
      await clearSessionCookie(uid).catch(() => {
        toast.error(
          'Você saiu neste dispositivo. Reconecte para encerrar a sessão do servidor.',
        )
      })
      synchronizedUid.current = null
    } finally {
      if (action.current === id) action.current = null
      if (mounted.current && generation.current === id) setStatus('ready')
    }
  }, [clearCache])

  React.useEffect(() => {
    mounted.current = true
    let active = true
    recordAuthStage('authentication:initializing')
    if (!redirectResult.current) {
      const pending = consumeGoogleRedirect()
      redirectResult.current = withAuthTimeout(getRedirectResult(auth))
        .then((result) => {
          if (pending && !result && !auth.currentUser) {
            toast.error(
              'O login com o Google não foi concluído. Tente novamente.',
            )
          }
        })
        .catch((error: unknown) => {
          recordAuthStage('google:redirect-error', error)
          toast.error(authErrorMessage(error))
        })
    }
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!active || action.current !== null) return
      const id = ++generation.current
      try {
        await redirectResult.current
        if (!active || action.current !== null || !isCurrent(id, firebaseUser))
          return
        recordAuthStage(
          firebaseUser ? 'observer:authenticated' : 'observer:anonymous',
        )
        if (hasPendingLogout() && firebaseUser) {
          await signOut(auth)
          return
        }
        await synchronize(
          firebaseUser,
          id,
          !initialized.current || synchronizedUid.current !== firebaseUser?.uid,
        )
      } catch (error) {
        failSession(error, id)
      } finally {
        if (active && action.current === null) initialized.current = true
      }
    })
    const reconcile = () => {
      if (!auth.currentUser && hasPendingLogout()) void retrySession()
    }
    window.addEventListener('online', reconcile)
    window.addEventListener('storage', reconcile)
    return () => {
      active = false
      mounted.current = false
      invalidate()
      unsubscribe()
      window.removeEventListener('online', reconcile)
      window.removeEventListener('storage', reconcile)
    }
  }, [synchronize, failSession, isCurrent, retrySession, invalidate])

  React.useEffect(() => {
    if (status !== 'ready' || !user || synchronizedUid.current !== user.uid)
      return
    if (!['/login', '/register', '/forgot-password'].includes(pathname)) return
    if (!navigating.current) {
      navigating.current = true
      recordAuthStage('navigation:dashboard')
      window.location.replace('/')
    }
  }, [status, user, pathname])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: status !== 'ready' && status !== 'error',
        sessionError,
        retrySession,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}
