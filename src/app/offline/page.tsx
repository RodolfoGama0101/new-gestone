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
    <main className="bg-muted flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6">
        <Logo size="lg" href="" />
      </div>
      <section className="border-border bg-background flex w-full max-w-[380px] flex-col items-center rounded-md border p-8">
        <div className="bg-muted text-muted-foreground mb-6 flex size-16 items-center justify-center rounded-full">
          <WifiOff className="text-muted-foreground/80 size-8" />
        </div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sem Conexão com a Internet
        </h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
          Não conseguimos carregar esta página. Verifique sua conexão com a rede
          e tente novamente.
        </p>
        <Button
          onClick={handleReload}
          className="mt-8 cursor-pointer gap-2 font-semibold"
        >
          <RotateCw className="size-4" />
          Tentar Novamente
        </Button>
      </section>
    </main>
  )
}
