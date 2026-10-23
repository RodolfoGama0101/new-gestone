import type { ReactNode } from 'react'
import { Receipt, CreditCard, ChartNoAxesCombined } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <aside
        aria-label="Sobre o GestOne"
        className="bg-card hidden flex-col justify-between border-r p-12 lg:flex xl:p-16"
      >
        <Logo variant="full" size="lg" href="" />
        <div className="my-16 max-w-lg space-y-8">
          <div className="bg-primary h-1 w-12" />
          <p className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            Suas finanças,
            <br />
            <span className="text-primary">com mais clareza.</span>
          </p>
          <p className="text-muted-foreground max-w-sm text-base leading-relaxed">
            Organize receitas e despesas, acompanhe suas faturas e planeje os
            próximos meses.
          </p>
          <ul className="divide-y border-y">
            {[
              { icon: Receipt, text: 'Lançamentos e extrato em um só lugar' },
              {
                icon: CreditCard,
                text: 'Cartões, faturas e compras parceladas',
              },
              {
                icon: ChartNoAxesCombined,
                text: 'Relatórios, orçamentos e metas',
              },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 py-4 text-sm">
                <Icon className="text-primary size-5" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-muted-foreground text-xs">
          Controle financeiro pessoal em reais.
        </p>
      </aside>
      <div className="relative flex min-w-0 flex-col items-center justify-center px-4 py-20 sm:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="mb-8 self-start lg:hidden">
          <Logo variant="full" size="md" />
        </div>
        <div className="bg-card w-full max-w-md rounded-xl border p-5 shadow-[var(--shadow-card)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
