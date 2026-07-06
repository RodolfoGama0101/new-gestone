import { ThemeToggle } from '@/components/shared/theme-toggle'
import { LoginForm } from '@/components/auth/login-form'
import { TrendingUp, Shield, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex">
      {/* Painel Esquerdo — Branding com gradiente */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        {/* Fundo decorativo com círculos */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-white/3 blur-3xl" />
          {/* Grade de pontos decorativa */}
          <svg className="absolute inset-0 size-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Conteúdo do branding */}
        <div className="relative z-10 flex flex-col items-start gap-10 max-w-sm w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <TrendingUp className="size-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">GestOne</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
              Controle seu<br />
              dinheiro com<br />
              <span className="text-white/70">inteligência</span>
            </h1>
            <p className="text-base text-white/70 leading-relaxed">
              Gerencie receitas, despesas e metas financeiras em um só lugar, de forma simples e visual.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: 'Gráficos analíticos em tempo real' },
              { icon: Shield, text: 'Dados seguros e isolados por usuário' },
              { icon: Sparkles, text: 'Exportação de extrato em CSV' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel Direito — Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background relative">
        {/* Theme Toggle no canto */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Logo mobile (apenas em telas pequenas) */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="size-9 rounded-xl bg-primary flex items-center justify-center">
            <TrendingUp className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-foreground">GestOne</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
