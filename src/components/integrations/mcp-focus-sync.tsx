'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { invalidateTransactionData } from '@/lib/transaction-cache'

export function McpFocusSync() {
  const { user } = useAuth()
  const client = useQueryClient()
  useEffect(() => {
    if (!user) return
    let last = 0
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 5000)
        return
      last = Date.now()
      void invalidateTransactionData(client, user.uid)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [client, user])
  return null
}
