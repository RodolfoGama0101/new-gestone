'use client'

import { useEffect } from 'react'
import { LoadError } from '@/components/shared/load-error'

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error({ event: 'dashboard-render-failed' })
  }, [error])
  return <LoadError error={error} retry={retry} />
}
