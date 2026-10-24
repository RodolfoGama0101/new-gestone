'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function McpConnections() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const query = useQuery({
    queryKey: ['mcpConnections', user?.uid],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/mcp/connections', {
        cache: 'no-store',
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(
          data.error_description ?? 'Não foi possível consultar as conexões.',
        )
      return data.connections.length as number
    },
  })
  const revoke = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/mcp/connections', { method: 'DELETE' })
      if (!response.ok)
        throw new Error('Não foi possível revogar. Tente novamente.')
    },
    onSuccess: () => {
      setError('')
      void query.refetch()
    },
    onError: (cause) => setError(cause.message),
  })
  const message = error || query.error?.message
  const count = query.data
  return (
    <Card>
      <CardHeader>
        <CardTitle>ChatGPT</CardTitle>
        <CardDescription>
          Conexões privadas para consultar e registrar lançamentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <>
            <p role="alert">{message}</p>
            <Button
              variant="outline"
              onClick={() => {
                setError('')
                void query.refetch()
              }}
            >
              Tentar novamente
            </Button>
          </>
        ) : (
          <p role="status">
            {count === undefined
              ? 'Consultando conexões…'
              : count
                ? count === 1
                  ? '1 conexão ativa.'
                  : `${count} conexões ativas.`
                : 'Nenhuma conexão ativa.'}
          </p>
        )}
        <Button
          variant="outline"
          disabled={!count || revoke.isPending}
          onClick={() => revoke.mutate()}
        >
          {revoke.isPending ? 'Revogando…' : 'Revogar acesso do ChatGPT'}
        </Button>
      </CardContent>
    </Card>
  )
}
