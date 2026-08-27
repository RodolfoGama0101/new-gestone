'use client'

import * as React from 'react'
import { User, getRedirectResult, onIdTokenChanged, signOut } from 'firebase/auth'
import { toast } from 'sonner'
import { auth } from '@/lib/firebase/config'
import {
  clearSessionCookie,
  signInWithEmail as signInWithEmailCredential,
  signInWithGoogle as signInWithGoogleCredential,
  signUpWithEmail as signUpWithEmailCredential,
  syncSessionCookie,
} from '@/lib/firebase/auth'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signInWithEmail: (email: string, password: string) => Promise<User>
  signUpWithEmail: (email: string, password: string) => Promise<User>
  signInWithGoogle: () => Promise<User | null>
  signOutUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signInWithEmail: async () => {
    throw new Error('AuthProvider não está disponível.')
  },
  signUpWithEmail: async () => {
    throw new Error('AuthProvider não está disponível.')
  },
  signInWithGoogle: async () => {
    throw new Error('AuthProvider não está disponível.')
  },
  signOutUser: async () => {
    throw new Error('AuthProvider não está disponível.')
  },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const isMountedRef = React.useRef(true)
  const hasInitializedRef = React.useRef(false)
  const authActionInFlightRef = React.useRef(false)
  const synchronizedUserIdRef = React.useRef<string | null>(null)
  const sessionQueueRef = React.useRef<Promise<void>>(Promise.resolve())

  const queueSessionOperation = React.useCallback((operation: () => Promise<void>) => {
    const queuedOperation = sessionQueueRef.current.then(operation, operation)
    sessionQueueRef.current = queuedOperation.catch(() => undefined)
    return queuedOperation
  }, [])

  const completeAuthentication = React.useCallback(
    async (authenticate: () => Promise<User | null>) => {
      authActionInFlightRef.current = true
      setIsLoading(true)

      try {
        const firebaseUser = await authenticate()
        if (!firebaseUser) return null

        await queueSessionOperation(() => syncSessionCookie(firebaseUser))
        synchronizedUserIdRef.current = firebaseUser.uid
        if (isMountedRef.current) setUser(firebaseUser)
        return firebaseUser
      } catch (error) {
        synchronizedUserIdRef.current = null
        if (isMountedRef.current) setUser(null)
        await signOut(auth).catch(() => undefined)
        throw error
      } finally {
        authActionInFlightRef.current = false
        if (isMountedRef.current) setIsLoading(false)
      }
    },
    [queueSessionOperation],
  )

  const signInWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const firebaseUser = await completeAuthentication(() => signInWithEmailCredential(email, password))
      if (!firebaseUser) throw new Error('O login por e-mail não retornou um usuário.')
      return firebaseUser
    },
    [completeAuthentication],
  )

  const signUpWithEmail = React.useCallback(
    async (email: string, password: string) => {
      const firebaseUser = await completeAuthentication(() => signUpWithEmailCredential(email, password))
      if (!firebaseUser) throw new Error('O cadastro não retornou um usuário.')
      return firebaseUser
    },
    [completeAuthentication],
  )

  const signInWithGoogle = React.useCallback(
    () => completeAuthentication(signInWithGoogleCredential),
    [completeAuthentication],
  )

  const signOutUser = React.useCallback(async () => {
    authActionInFlightRef.current = true
    setIsLoading(true)

    try {
      await queueSessionOperation(clearSessionCookie)
      await signOut(auth)
      synchronizedUserIdRef.current = null
      if (isMountedRef.current) setUser(null)
    } finally {
      authActionInFlightRef.current = false
      if (isMountedRef.current) setIsLoading(false)
    }
  }, [queueSessionOperation])

  React.useEffect(() => {
    isMountedRef.current = true

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      const isInitialState = !hasInitializedRef.current

      try {
        if (isInitialState) {
          setIsLoading(true)
          await queueSessionOperation(() =>
            firebaseUser ? syncSessionCookie(firebaseUser) : clearSessionCookie(),
          )
          synchronizedUserIdRef.current = firebaseUser?.uid ?? null
          hasInitializedRef.current = true
        } else if (!authActionInFlightRef.current) {
          if (firebaseUser && synchronizedUserIdRef.current !== firebaseUser.uid) {
            setIsLoading(true)
            await queueSessionOperation(() => syncSessionCookie(firebaseUser))
            synchronizedUserIdRef.current = firebaseUser.uid
          } else if (!firebaseUser) {
            await queueSessionOperation(clearSessionCookie)
            synchronizedUserIdRef.current = null
          }
        }

        if (isMountedRef.current) setUser(firebaseUser)
      } catch (error) {
        console.error('Failed to synchronize the authentication session:', error)
        synchronizedUserIdRef.current = null
        if (isMountedRef.current) setUser(null)
        if (firebaseUser) await signOut(auth).catch(() => undefined)
      } finally {
        if (isInitialState) hasInitializedRef.current = true
        if (isMountedRef.current && (isInitialState || !authActionInFlightRef.current)) {
          setIsLoading(false)
        }
      }
    })

    void getRedirectResult(auth).catch((error) => {
      const authError = error as { code?: string }
      console.error('Google redirect sign-in failed:', error)
      if (authError.code !== 'auth/null-user') {
        toast.error('Não foi possível concluir o login com o Google. Tente novamente.')
      }
    })

    return () => {
      isMountedRef.current = false
      unsubscribe()
    }
  }, [queueSessionOperation])

  React.useEffect(() => {
    if (!isLoading && user) {
      const isAuthPage =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password'
      if (isAuthPage) {
        router.replace('/')
        router.refresh()
      }
    }
  }, [user, isLoading, pathname, router])

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}
