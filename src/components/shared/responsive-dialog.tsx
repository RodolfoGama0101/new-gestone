'use client'

import type { ComponentProps } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// One Base UI dialog keeps form state and focus intact across viewport changes.
// Below md its popup uses the full-width bottom-sheet presentation.
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
}: {
  open: boolean
  onOpenChange: ComponentProps<typeof Dialog>['onOpenChange']
  title: string
  description: string
  trigger?: React.ReactElement
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="responsive-dialog translate-x-0 translate-y-0 md:max-w-xl">
        <DialogHeader className="pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
