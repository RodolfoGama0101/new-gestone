import { ThemeToggle } from '@/components/shared/theme-toggle'
import { LoginForm } from '@/components/auth/login-form'
import { Shield, TrendingUp, FileDown } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

const FEATURES = [
  { icon: TrendingUp, text: 'Gráficos analíticos em tempo real' },
  { icon: Shield, text: 'Dados seguros e isolados por usuário' },
  { icon: FileDown, text: 'Exportação de extrato em CSV' },
]

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col items-center justify-center p-14 bg-black">
        {/* Decorative background grid */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg className="absolute inset-0 size-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#ffffff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
          {/* Subtle light border in center */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* Branding content */}
        <div className="relative z-10 flex flex-col items-start gap-12 max-w-md w-full">
          {/* Logo */}
          <Logo variant="full" size="lg" textColor="text-white" href="" />

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              Controle seu<br />
              dinheiro com<br />
              <span className="text-neutral-400 font-medium">inteligência</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
              Gerencie receitas, despesas e metas financeiras em um só lugar, de forma simples e visual.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="size-7 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-neutral-300">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative">
        {/* Theme Toggle */}
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-center mb-10">
          <Logo variant="full" size="md" />
        </div>

        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="mb-8 space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          <LoginForm />

          <p className="mt-7 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
