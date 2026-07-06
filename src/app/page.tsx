'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { signOutUser } from '@/lib/firebase/auth'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowRight, 
  PiggyBank, 
  LineChart, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  LogOut
} from 'lucide-react'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <PiggyBank className="size-6 text-primary" />
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              GestOne
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={signOutUser}>
                  <LogOut className="size-3.5" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Entrar</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Badge variant="secondary" className="mb-4 text-xs font-semibold px-3 py-1">
              ✨ GestOne v1.0 — Em Desenvolvimento
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
              Simplifique sua vida financeira com o{' '}
              <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                GestOne
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Uma aplicação moderna, mobile-first, 100% gratuita no plano Firebase Spark para organizar receitas, despesas, e otimizar suas economias.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" className="gap-2">
                Começar Agora <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline">
                Ver Recursos
              </Button>
            </div>
          </div>
        </section>

        {/* Demo Cards Section (Testing CSS Colors & Theme) */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-border">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Fundação e Tokens Visuais</h2>
            <p className="text-muted-foreground">Demonstração das cores e tema configurados na Etapa 1.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Balance Card Mockup */}
            <Card className="shadow-lg border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Geral</CardTitle>
                <Wallet className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold">R$ 5.240,50</div>
                <p className="text-xs text-muted-foreground mt-1">Atualizado em tempo real</p>
              </CardContent>
            </Card>

            {/* Income Card Mockup */}
            <Card className="shadow-lg border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receitas Mensais</CardTitle>
                <TrendingUp className="size-4 text-income" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-income">R$ 8.000,00</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-income bg-income/10 px-2 py-0.5 rounded-full w-fit">
                  <CheckCircle2 className="size-3.5" />
                  +12.4% em relação ao mês anterior
                </div>
              </CardContent>
            </Card>

            {/* Expense Card Mockup */}
            <Card className="shadow-lg border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Despesas Mensais</CardTitle>
                <TrendingDown className="size-4 text-expense" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-expense">R$ 2.759,50</div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-expense bg-expense/10 px-2 py-0.5 rounded-full w-fit">
                  <TrendingDown className="size-3.5" />
                  Consumo controlado dentro do limite
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 border-t border-border">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary/10 rounded-lg text-primary mb-4">
                <Smartphone className="size-6" />
              </div>
              <h3 className="font-semibold text-lg">PWA Mobile-First</h3>
              <p className="text-sm text-muted-foreground mt-2">Design feito para celulares com possibilidade de instalar como app nativo.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary/10 rounded-lg text-primary mb-4">
                <LineChart className="size-6" />
              </div>
              <h3 className="font-semibold text-lg">Gráficos Avançados</h3>
              <p className="text-sm text-muted-foreground mt-2">Visão integrada das receitas, despesas e evolução patrimonial com Recharts.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary/10 rounded-lg text-primary mb-4">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-semibold text-lg">Segurança de Ponta</h3>
              <p className="text-sm text-muted-foreground mt-2">Dados isolados por usuário com Firebase Security Rules robustas.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-card rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary/10 rounded-lg text-primary mb-4">
                <Wallet className="size-6" />
              </div>
              <h3 className="font-semibold text-lg">Sem Custos Extras</h3>
              <p className="text-sm text-muted-foreground mt-2">Hospedado na Vercel e Firebase no plano 100% gratuito (Spark).</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} GestOne. Desenvolvido sob alta fidelidade de design system.</p>
        </div>
      </footer>
    </div>
  )
}
