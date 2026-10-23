'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/components/shared/responsive-dialog'
import { TransactionForm } from './transaction-form'

export function QuickTransaction() {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 max-w-[calc(100%-2rem)] md:static">
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Novo lançamento"
        description="Registre uma receita, despesa ou investimento."
        trigger={
          <Button className="max-w-full gap-2 whitespace-normal shadow-md md:shadow-none">
            <Plus className="size-4" aria-hidden="true" />
            Novo lançamento
          </Button>
        }
      >
        <TransactionForm onSuccess={() => setOpen(false)} />
      </ResponsiveDialog>
    </div>
  )
}
