'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function McpConsent({
  query,
  signedIn,
}: {
  query: string
  signedIn: boolean
}) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const [error, setError] = useState('')
  async function authorize() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/mcp/oauth/authorize', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const result = await response.json()
      if (!response.ok)
        throw new Error(
          result.error_description ?? 'Não foi possível conectar.',
        )
      window.location.assign(result.redirect)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível conectar.',
      )
      setBusy(false)
    }
  }
  if (!signedIn)
    return (
      <div className="space-y-4">
        <p>
          Entre no GestOne em outra aba e volte aqui para autorizar a conexão.
        </p>
        <a
          className="text-link underline"
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
        >
          Entrar no GestOne (nova aba)
        </a>
        <Button className="block" onClick={() => window.location.reload()}>
          Já entrei, continuar
        </Button>
      </div>
    )
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={authorize}>
          {busy ? 'Conectando…' : 'Autorizar conexão'}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => router.push('/settings')}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
