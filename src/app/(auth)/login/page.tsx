import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function LoginPage() {
  return (
    <AuthShell>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground text-sm">
          Entre na sua conta para continuar
        </p>
      </div>
      <LoginForm />
      <p className="text-muted-foreground mt-6 text-sm">
        Não tem uma conta?{' '}
        <Link
          href="/register"
          className="text-primary inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          Criar conta grátis
        </Link>
      </p>
    </AuthShell>
  )
}
