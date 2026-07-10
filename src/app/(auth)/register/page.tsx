import { ThemeToggle } from '@/components/shared/theme-toggle'
import { RegisterForm } from '@/components/auth/register-form'
import { BarChart3, Tag, Download } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex">
      {/* Painel Esquerdo — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 size-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/5 blur-3xl" />
          <svg className="absolute inset-0 size-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots-reg" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots-reg)" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-start gap-10 max-w-sm w-full">
          <Logo variant="full" size="lg" textColor="text-white hover:opacity-100" href="" />

          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
              Comece sua<br />
              jornada<br />
              <span className="text-white/70">financeira hoje</span>
            </h1>
            <p className="text-base text-white/70 leading-relaxed">
              Crie sua conta gratuitamente e tenha controle total das suas finanças pessoais.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: BarChart3, text: 'Dashboard com visão geral completa' },
              { icon: Tag, text: 'Categorias personalizadas de gastos' },
              { icon: Download, text: 'Exportação de dados em CSV' },
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background relative overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center justify-center mb-8">
          <Logo variant="full" size="md" />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-1">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Criar conta grátis
            </h2>
            <p className="text-sm text-muted-foreground">
              Preencha os campos abaixo para começar
            </p>
          </div>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
