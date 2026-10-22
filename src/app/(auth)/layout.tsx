import type { ReactNode } from 'react'
import { SkipLink } from '@/components/shared/skip-link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <><SkipLink /><main id="main-content" tabIndex={-1}>{children}</main></>
}
