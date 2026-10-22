'use client'

import { Button } from '@/components/ui/button'
import { loadErrorMessage } from '@/lib/utils/load-error'

export function LoadError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return (
    <div role="alert" className="space-y-3 rounded-md border border-destructive/30 bg-card p-5">
      <p>{loadErrorMessage(error)}</p>
      <Button variant="outline" onClick={() => { void retry() }}>Tentar novamente</Button>
    </div>
  )
}
