'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'

export function SessionRecovery() {
  const { sessionError, retrySession, isLoading } = useAuth()
  if (!sessionError) return null
  return (
    <div className="border-border mb-4 space-y-3 rounded-lg border p-4">
      <p role="alert" className="text-sm">
        {sessionError}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={isLoading}
        onClick={() => void retrySession()}
      >
        {isLoading ? 'Verificando sessão…' : 'Tentar sincronizar sessão'}
      </Button>
    </div>
  )
}
