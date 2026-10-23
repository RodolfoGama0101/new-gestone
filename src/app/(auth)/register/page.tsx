import Link from 'next/link'
import { RegisterForm } from '@/components/auth/register-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Criar conta grátis
        </h1>
        <p className="text-muted-foreground text-sm">
          Preencha os campos abaixo para começar
        </p>
      </div>
      <RegisterForm />
      <p className="text-muted-foreground mt-6 text-sm">
        Já tem uma conta?{' '}
        <Link
          href="/login"
          className="text-primary inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          Fazer login
        </Link>
      </p>
    </AuthShell>
  )
}
