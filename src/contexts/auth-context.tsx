'use client'

import * as React from 'react'
import { User, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { syncSessionCookie } from '@/lib/firebase/auth'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  isLoading: boolean
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setIsLoading(true)
        if (firebaseUser) {
          await syncSessionCookie(firebaseUser)
          setUser(firebaseUser)
        } else {
          // Clear session cookie first
          await fetch('/api/auth/session', {
            method: 'DELETE',
          }).then(async (response) => {
            if (!response.ok) throw new Error(await response.text())
          })
          setUser(null)
        }
      } catch (error) {
        console.error('Failed to sync auth session:', error)
        setUser(null)
        if (firebaseUser) {
          await signOut(auth)
        }
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  React.useEffect(() => {
    if (!isLoading && user) {
      const isAuthPage =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/forgot-password'
      if (isAuthPage) {
        router.push('/')
        router.refresh()
      }
    }
  }, [user, isLoading, pathname, router])

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return React.useContext(AuthContext)
}
