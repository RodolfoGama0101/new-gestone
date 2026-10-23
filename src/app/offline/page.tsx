'use client'

import * as React from 'react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { WifiOff, RotateCw } from 'lucide-react'

export default function OfflinePage() {
  const handleReload = () => {
    window.location.reload()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="mb-8"><Logo size="lg" href="" /></div>
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
        <WifiOff className="size-8 text-muted-foreground/80" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sem Conexão com a Internet</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Não conseguimos carregar esta página. Verifique sua conexão com a rede e tente novamente.
      </p>
      <Button
        variant="outline"
        onClick={handleReload}
        className="mt-8 gap-2 font-semibold cursor-pointer"
      >
        <RotateCw className="size-4" />
        Tentar Novamente
      </Button>
    </main>
  )
}
